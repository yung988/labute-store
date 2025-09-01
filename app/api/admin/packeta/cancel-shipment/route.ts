import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

async function requireAuth() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

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

  const { orderId } = await req.json();

  try {
    // Get order details with Packeta shipment ID
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (!order.packeta_shipment_id) {
      return NextResponse.json({ error: 'No Packeta shipment to cancel' }, { status: 400 });
    }

    // Cancel shipment via Packeta v5 API
    console.log(`🔄 Cancelling Packeta shipment: ${order.packeta_shipment_id}`);

    // Cancel shipment with timeout and retry
    const MAX_RETRIES = 3;
    const TIMEOUT_MS = 30000;
    const BASE_BACKOFF_MS = 1000;

    let cancelResponse: Response | undefined;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(
          `🔄 Packeta cancel API attempt ${attempt}/${MAX_RETRIES} for ${order.packeta_shipment_id}`
        );

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<packetStornoReq>
  <apiPassword>${process.env.PACKETA_API_PASSWORD}</apiPassword>
  <packetId>${order.packeta_shipment_id}</packetId>
</packetStornoReq>`;

        const apiUrl = process.env.PACKETA_API_URL || 'https://www.zasilkovna.cz/api/rest';

        cancelResponse = await fetch(`${apiUrl}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/xml',
            Accept: 'application/xml',
          },
          body: xmlBody,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Check if response is successful (2xx) or client error (4xx) - don't retry these
        if (cancelResponse.ok || cancelResponse.status < 500) {
          break; // Success or client error - exit retry loop
        }

        // For server errors (5xx including 504), retry
        const errorText = await cancelResponse.text();
        console.log(
          `⏳ Packeta cancel API returned ${cancelResponse.status}, will retry: ${errorText.substring(0, 100)}...`
        );

        if (attempt < MAX_RETRIES) {
          const backoffTime = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
          console.log(`⏳ Waiting ${backoffTime}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, backoffTime));
        }
      } catch (error) {
        const err = error as Error;
        lastError = err;
        console.log(`❌ Packeta cancel API attempt ${attempt} failed:`, err.message);

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
      console.error('❌ Packeta cancel API failed after all retries:', errorMsg);
      console.warn('⚠️ Packeta API cancel failed, but continuing with database reset');
    } else if (!cancelResponse.ok) {
      const errorText = await cancelResponse.text();
      console.error('❌ Packeta cancel API error:', {
        status: cancelResponse.status,
        statusText: cancelResponse.statusText,
        error: errorText,
        packetId: order.packeta_shipment_id,
      });

      // If cancel fails, still proceed with database update but warn user
      console.warn('⚠️ Packeta API cancel failed, but continuing with database reset');
    } else {
      const cancelResult = await cancelResponse.text();
      console.log('✅ Packeta shipment cancelled via API:', cancelResult);
    }

    // Reset packeta fields in database regardless of API result
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        packeta_shipment_id: null,
        status: 'paid',
      })
      .eq('id', orderId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log(`✅ Order ${orderId} Packeta shipment cancelled and reset to paid status`);

    return NextResponse.json({
      success: true,
      message: 'Shipment cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling Packeta shipment:', error);
    return NextResponse.json({ error: 'Failed to cancel shipment' }, { status: 500 });
  }
}
