import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import sendOrderStatusEmail from "@/lib/stripe/send-status-email";

// Simple fetch with timeout and retries for transient Packeta issues (e.g., 5xx/504)
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: { retries?: number; timeoutMs?: number; backoffMs?: number } = {}
) {
  const { retries = 2, timeoutMs = 15000, backoffMs = 600 } = opts;
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
    // Exponential backoff with jitter
    const wait = backoffMs * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
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
  const expectedSecret = process.env.CRON_SECRET || 'your-secret-key';
  return cronSecret === `Bearer ${expectedSecret}`;
}

// Map Packeta status to our internal status
function mapPacketaStatusToOrderStatus(packetaStatus: string): string {
  const statusMap: Record<string, string> = {
    'created': 'processing',
    'handed_to_carrier': 'shipped', 
    'in_transit': 'shipped',
    'ready_for_pickup': 'shipped',
    'delivered': 'delivered',
    'returned': 'returned',
    'cancelled': 'cancelled'
  };
  
  return statusMap[packetaStatus.toLowerCase()] || 'processing';
}

export async function GET(req: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("🕐 Starting Packeta status check cron job");

    // Get all active orders with Packeta shipments that are not delivered/cancelled
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("id, packeta_shipment_id, status, customer_email, customer_name, items")
      .not("packeta_shipment_id", "is", null)
      .not("status", "in", '("delivered","cancelled","returned")');

    if (ordersError) {
      console.error("❌ Error fetching orders:", ordersError);
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    if (!orders || orders.length === 0) {
      console.log("ℹ️ No active shipments to check");
      return NextResponse.json({ 
        success: true, 
        message: "No active shipments to check",
        checked: 0
      });
    }

    console.log(`🔍 Checking ${orders.length} active shipments`);

    let updatedCount = 0;
    const errors: string[] = [];

    // Check each shipment status
    for (const order of orders) {
      try {
        console.log(`Checking shipment ${order.packeta_shipment_id} for order ${order.id}`);

        // Call Packeta API to get current status
        const trackingResponse = await fetchWithRetry(
          `https://api.packeta.com/v3/packet/${order.packeta_shipment_id}/tracking`,
          {
            headers: {
              "Authorization": `ApiKey ${process.env.PACKETA_API_KEY}`,
              "Accept": "application/json",
              "User-Agent": "labute-store/cron (Packeta status check)"
            },
          },
          { retries: 2, timeoutMs: 15000, backoffMs: 600 }
        );

        if (!trackingResponse.ok) {
          const errorText = await trackingResponse.text();
          console.error(`❌ Packeta API error for ${order.packeta_shipment_id}:`, errorText);
          errors.push(`${order.id}: ${trackingResponse.status} ${errorText}`);
          continue;
        }

        const trackingData = await trackingResponse.json();
        const packetaStatus = trackingData.status || trackingData.state?.name;
        
        if (!packetaStatus) {
          console.warn(`⚠️ No status found for ${order.packeta_shipment_id}`);
          continue;
        }

        // Map to our internal status
        const newStatus = mapPacketaStatusToOrderStatus(packetaStatus);
        const previousStatus = order.status;

        // Only update if status changed
        if (newStatus !== previousStatus) {
          console.log(`🔄 Status change for ${order.id}: ${previousStatus} → ${newStatus} (Packeta: ${packetaStatus})`);

          // Update order status
          const { error: updateError } = await supabaseAdmin
            .from("orders")
            .update({ 
              status: newStatus,
              updated_at: new Date().toISOString()
            })
            .eq("id", order.id);

          if (updateError) {
            console.error(`❌ Failed to update order ${order.id}:`, updateError);
            errors.push(`${order.id}: Update failed - ${updateError.message}`);
            continue;
          }

          updatedCount++;

          // Send status email to customer
          if (order.customer_email) {
            try {
              await sendOrderStatusEmail({
                id: order.id,
                customer_email: order.customer_email,
                customer_name: order.customer_name,
                status: newStatus,
                items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
                packeta_shipment_id: order.packeta_shipment_id
              }, previousStatus);

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
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`❌ Error processing order ${order.id}:`, error);
        errors.push(`${order.id}: ${error}`);
        continue;
      }
    }

    console.log(`✅ Packeta status check completed: ${updatedCount}/${orders.length} orders updated`);

    return NextResponse.json({
      success: true,
      checked: orders.length,
      updated: updatedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error("❌ Cron job error:", error);
    return NextResponse.json(
      { error: "Cron job failed" },
      { status: 500 }
    );
  }
}

// Health check
export async function POST() {
  return NextResponse.json({ 
    status: "ok", 
    cron: "packeta-status-check",
    timestamp: new Date().toISOString()
  });
}