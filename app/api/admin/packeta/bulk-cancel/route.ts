import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAdminAuth } from '@/lib/middleware/admin-verification';

async function handler() {

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
    // Get all orders with packeta_shipment_id that are not shipped
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, packeta_shipment_id, status')
      .not('packeta_shipment_id', 'is', null)
      .neq('status', 'shipped');

    if (ordersError) {
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No shipments to cancel',
        cancelled: 0,
      });
    }

    console.log(`🔄 Attempting to cancel ${orders.length} Packeta shipments`);

    // Collect all packet IDs
    const packetIds = orders.map((order) => order.packeta_shipment_id).filter(Boolean);

    let cancelledCount = 0;
    const errors: string[] = [];

    // Cancel via Packeta API in batches
    if (packetIds.length > 0) {
      try {
        // Bulk cancel with timeout and retry
        const MAX_RETRIES = 3;
        const TIMEOUT_MS = 30000;
        const BASE_BACKOFF_MS = 1000;

        let cancelResponse: Response | undefined;
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            console.log(
              `🔄 Packeta bulk cancel API attempt ${attempt}/${MAX_RETRIES} for ${packetIds.length} shipments`
            );

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

            // For bulk cancel, we need to make individual XML requests
            const apiUrl = process.env.PACKETA_API_URL || 'https://www.zasilkovna.cz/api/rest';

            const cancelPromises = packetIds.map(async (packetId) => {
              const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<packetStornoReq>
  <apiPassword>${process.env.PACKETA_API_PASSWORD}</apiPassword>
  <packetId>${packetId}</packetId>
</packetStornoReq>`;

              return fetch(`${apiUrl}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/xml',
                  Accept: 'application/xml',
                },
                body: xmlBody,
                signal: controller.signal,
              });
            });

            const responses = await Promise.allSettled(cancelPromises);

            // Create a synthetic response based on results
            const successCount = responses.filter(
              (r) => r.status === 'fulfilled' && r.value.ok
            ).length;
            cancelResponse = {
              ok: successCount > 0,
              status: successCount === packetIds.length ? 200 : 207, // Multi-status if partial success
              statusText: `${successCount}/${packetIds.length} packets cancelled`,
              json: async () => ({ cancelled: successCount, total: packetIds.length }),
              text: async () => `${successCount}/${packetIds.length} packets cancelled`,
            } as Response;

            clearTimeout(timeoutId);

            // Check if response is successful (2xx) or client error (4xx) - don't retry these
            if (cancelResponse.ok || cancelResponse.status < 500) {
              break; // Success or client error - exit retry loop
            }

            // For server errors (5xx including 504), retry
            const errorText = await cancelResponse.text();
            console.log(
              `⏳ Packeta bulk cancel API returned ${cancelResponse.status}, will retry: ${errorText.substring(0, 100)}...`
            );

            if (attempt < MAX_RETRIES) {
              const backoffTime = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
              console.log(`⏳ Waiting ${backoffTime}ms before retry...`);
              await new Promise((resolve) => setTimeout(resolve, backoffTime));
            }
          } catch (error) {
            const err = error as Error;
            lastError = err;
            console.log(`❌ Packeta bulk cancel API attempt ${attempt} failed:`, err.message);

            if (attempt < MAX_RETRIES) {
              const backoffTime = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
              console.log(`⏳ Network error, waiting ${backoffTime}ms before retry...`);
              await new Promise((resolve) => setTimeout(resolve, backoffTime));
            }
          }
        }

        // Handle cancel response
        if (!cancelResponse) {
          const errorMsg = lastError ? lastError.message : 'Unknown network error';
          console.error('❌ Packeta bulk cancel API failed after all retries:', errorMsg);
          errors.push(`Packeta bulk cancel failed after ${MAX_RETRIES} attempts: ${errorMsg}`);
        } else if (cancelResponse.ok) {
          const result = await cancelResponse.json();
          console.log('✅ Packeta bulk cancel success:', result);
          cancelledCount = result.cancelled || packetIds.length;
        } else {
          const errorText = await cancelResponse.text();
          console.error('❌ Packeta bulk cancel error:', {
            status: cancelResponse.status,
            statusText: cancelResponse.statusText,
            error: errorText,
            packetIds,
          });

          // Return user-friendly error messages
          if (cancelResponse.status === 504) {
            errors.push(
              `Packeta bulk cancel temporarily unavailable (gateway timeout). Please try again in a few minutes.`
            );
          } else if (cancelResponse.status >= 500) {
            errors.push(
              `Packeta bulk cancel experiencing server issues. Please try again in a few minutes.`
            );
          } else {
            errors.push(`Packeta bulk cancel error: ${cancelResponse.status} ${errorText}`);
          }
        }
      } catch (error) {
        console.error('❌ Packeta API call failed:', error);
        errors.push(`API call failed: ${error}`);
      }
    }

    // Reset database records regardless of API result
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        packeta_shipment_id: null,
        status: 'paid',
      })
      .not('packeta_shipment_id', 'is', null)
      .neq('status', 'shipped');

    if (updateError) {
      errors.push(`Database update failed: ${updateError.message}`);
    }

    console.log(`✅ Bulk cancelled ${orders.length} orders in database`);

    return NextResponse.json({
      success: true,
      message: `Processed ${orders.length} shipments`,
      cancelled: cancelledCount,
      database_reset: orders.length,
      errors: errors.length > 0 ? errors : undefined,
      order_ids: orders.map((o) => o.id),
    });
  } catch (error) {
    console.error('Error in bulk cancel:', error);
    return NextResponse.json({ error: 'Failed to cancel shipments' }, { status: 500 });
  }
}

export const POST = withAdminAuth(handler);
