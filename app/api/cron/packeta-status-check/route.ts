import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import sendOrderStatusEmail from '@/lib/stripe/send-status-email';

// Simple fetch with timeout and retries for transient Packeta issues (e.g., 5xx/504)
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: { retries?: number; timeoutMs?: number; backoffMs?: number } = {}
) {
  const { retries = 3, timeoutMs = 20000, backoffMs = 800 } = opts;
  let attempt = 0;
  let lastErr: unknown;
  while (attempt <= retries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      // Retry on 429 or 5xx
      if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
        lastErr = new Error(`HTTP ${res.status}`);
      } else {
        clearTimeout(timer);
        return res;
      }
    } catch (e) {
      lastErr = e;
    } finally {
      clearTimeout(timer);
    }
    if (attempt === retries) break;
    // Respect Retry-After when available on 429
    let wait = backoffMs * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
    if (lastErr instanceof Error && /HTTP 429/.test(lastErr.message)) {
      // best-effort: we don't have headers here, so let caller pass backoff or just use larger backoff
      wait = Math.max(wait, 3000);
    }
    await new Promise((r) => setTimeout(r, wait));
    attempt++;
  }
  if (lastErr instanceof Error) {
    throw lastErr;
  }
  throw new Error(String(lastErr));
}

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(req: NextRequest): boolean {
  const cronSecret = req.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    console.error('CRON_SECRET environment variable is not set');
    return false;
  }
  return cronSecret === `Bearer ${expectedSecret}`;
}

// Map Packeta status to our internal status
function mapPacketaStatusToOrderStatus(packetaStatus: string): string {
  const statusMap: Record<string, string> = {
    created: 'processing',
    handed_to_carrier: 'shipped',
    in_transit: 'shipped',
    ready_for_pickup: 'shipped',
    delivered: 'delivered',
    returned: 'returned',
    cancelled: 'cancelled',
  };

  return statusMap[packetaStatus.toLowerCase()] || 'processing';
}

export async function GET(req: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if Packeta API password is configured
  if (!process.env.PACKETA_API_PASSWORD) {
    console.error('❌ PACKETA_API_PASSWORD is not set on Vercel!');
    return NextResponse.json(
      {
        error:
          'Packeta API password is not configured on Vercel. Please set PACKETA_API_PASSWORD environment variable.',
      },
      { status: 500 }
    );
  }

  try {
    console.log('🕐 Starting Packeta status check cron job');

    // Get all active orders with Packeta shipments that are not delivered/cancelled
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, packeta_shipment_id, status, customer_email, customer_name, items')
      .not('packeta_shipment_id', 'is', null)
      .not('status', 'in', '("delivered","cancelled","returned")');

    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError);
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    if (!orders || orders.length === 0) {
      console.log('ℹ️ No active shipments to check');
      return NextResponse.json({
        success: true,
        message: 'No active shipments to check',
        checked: 0,
      });
    }

    console.log(`🔍 Checking ${orders.length} active shipments`);

    let updatedCount = 0;
    const errors: string[] = [];

    // Check each shipment status
    for (const order of orders) {
      try {
        console.log(`Checking shipment ${order.packeta_shipment_id} for order ${order.id}`);

        // Call Packeta XML API to get current status
        const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<packetStatus>
  <apiPassword>${process.env.PACKETA_API_PASSWORD}</apiPassword>
  <packetId>${order.packeta_shipment_id}</packetId>
</packetStatus>`;

        const apiUrl = process.env.PACKETA_API_URL || 'https://www.zasilkovna.cz/api/rest';

        const trackingResponse = await fetchWithRetry(
          apiUrl,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/xml',
              Accept: 'application/xml',
              'User-Agent': 'labute-store/cron (Packeta status check)',
            },
            body: xmlBody,
          },
          { retries: 3, timeoutMs: 20000, backoffMs: 800 }
        );

        if (!trackingResponse.ok) {
          const contentType = trackingResponse.headers.get('content-type') || '';
          const xAzureRef =
            trackingResponse.headers.get('x-azure-ref') ||
            trackingResponse.headers.get('x-azure-ref-originshield') ||
            undefined;
          const errorText = await trackingResponse.text();
          console.error(`❌ Packeta API error for ${order.packeta_shipment_id}:`, {
            status: trackingResponse.status,
            contentType,
            xAzureRef,
            snippet: errorText?.slice(0, 300),
          });
          errors.push(`${order.id}: ${trackingResponse.status} ${errorText}`);
          continue;
        }

        const trackingData = await trackingResponse.text();
        // Packeta API returns XML, not JSON - parse status from XML
        const statusMatch = trackingData.match(/<status[^>]*>([^<]*)<\/status>/);
        const packetaStatus = statusMatch ? statusMatch[1] : null;

        if (!packetaStatus) {
          console.warn(`⚠️ No status found for ${order.packeta_shipment_id}`);
          continue;
        }

        // Map to our internal status
        const newStatus = mapPacketaStatusToOrderStatus(packetaStatus);
        const previousStatus = order.status;

        // Only update if status changed
        if (newStatus !== previousStatus) {
          console.log(
            `🔄 Status change for ${order.id}: ${previousStatus} → ${newStatus} (Packeta: ${packetaStatus})`
          );

          // Update order status
          const { error: updateError } = await supabaseAdmin
            .from('orders')
            .update({
              status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('id', order.id);

          if (updateError) {
            console.error(`❌ Failed to update order ${order.id}:`, updateError);
            errors.push(`${order.id}: Update failed - ${updateError.message}`);
            continue;
          }

          updatedCount++;

          // Send status email to customer
          if (order.customer_email) {
            try {
              await sendOrderStatusEmail(
                {
                  id: order.id,
                  customer_email: order.customer_email,
                  customer_name: order.customer_name,
                  status: newStatus,
                  items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
                  packeta_shipment_id: order.packeta_shipment_id,
                },
                previousStatus
              );

              console.log(`📧 Status email sent to ${order.customer_email}`);
            } catch (emailError) {
              console.error(`❌ Failed to send email for ${order.id}:`, emailError);
              // Don't fail the whole process if email fails
            }
          }
        } else {
          console.log(`✅ Status unchanged for ${order.id}: ${newStatus}`);
        }

        // Add small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`❌ Error processing order ${order.id}:`, error);
        errors.push(`${order.id}: ${error}`);
        continue;
      }
    }

    console.log(
      `✅ Packeta status check completed: ${updatedCount}/${orders.length} orders updated`
    );

    return NextResponse.json({
      success: true,
      checked: orders.length,
      updated: updatedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('❌ Cron job error:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}

// Health check
export async function POST() {
  return NextResponse.json({
    status: 'ok',
    cron: 'packeta-status-check',
    timestamp: new Date().toISOString(),
  });
}
