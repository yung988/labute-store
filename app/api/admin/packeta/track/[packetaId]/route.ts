import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";



async function requireAuth() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ packetaId: string }> },
) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  const { packetaId } = await context.params;

  // Check if Packeta API password is configured
  if (!process.env.PACKETA_API_PASSWORD) {
    console.error('❌ PACKETA_API_PASSWORD is not set on Vercel!');
    return NextResponse.json(
      { error: 'Packeta API password is not configured on Vercel. Please set PACKETA_API_PASSWORD environment variable.' },
      { status: 500 }
    );
  }

  try {
    console.log(`🔍 Tracking Packeta shipment: ${packetaId}`);

    // Call Packeta JSON tracking API with timeout and retry
    const MAX_RETRIES = 3;
    const TIMEOUT_MS = 30000;
    const BASE_BACKOFF_MS = 1000;

    let packetaRes: Response | undefined;
    let lastError: Error | null = null;

    console.log(`🔍 Tracking Packeta shipment via JSON API: ${packetaId}`);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`🔍 Tracking Packeta shipment: ${packetaId} (attempt ${attempt}/${MAX_RETRIES})`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        packetaRes = await fetch(`https://api.packeta.com/v5/packets/${packetaId}/status`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${process.env.PACKETA_API_PASSWORD}`,
            "Accept": "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Check if response is successful (2xx) or client error (4xx) - don't retry these
        if (packetaRes.ok || packetaRes.status < 500) {
          break; // Success or client error - exit retry loop
        }

        // For server errors (5xx including 504), retry
        const errorText = await packetaRes.text();
        console.log(`⏳ Packeta XML tracking API returned ${packetaRes.status}, will retry: ${errorText.substring(0, 100)}...`);

        if (attempt < MAX_RETRIES) {
          const backoffTime = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
          console.log(`⏳ Waiting ${backoffTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }

      } catch (error) {
        const err = error as Error;
        lastError = err;
        console.log(`❌ Packeta XML tracking API attempt ${attempt} failed:`, err.message);

        if (attempt < MAX_RETRIES) {
          const backoffTime = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
          console.log(`⏳ Network error, waiting ${backoffTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }
    }

    // Check if we got any response
    if (!packetaRes) {
      const errorMsg = lastError ? lastError.message : 'Unknown network error';
      console.error('❌ Packeta tracking API failed after all retries:', errorMsg);
      return NextResponse.json(
        { error: `Packeta tracking API is temporarily unavailable after ${MAX_RETRIES} attempts. Please try again in a few minutes.` },
        { status: 503 }
      );
    }

    if (!packetaRes.ok) {
      const errorText = await packetaRes.text();
      console.error("❌ Packeta tracking API error:", {
        status: packetaRes.status,
        statusText: packetaRes.statusText,
        error: errorText,
        packetId: packetaId
      });

      // Return user-friendly error messages
      if (packetaRes.status === 504) {
        return NextResponse.json(
          { error: "Packeta tracking API is temporarily unavailable (gateway timeout). Please try again in a few minutes." },
          { status: 503 }
        );
      } else if (packetaRes.status >= 500) {
        return NextResponse.json(
          { error: "Packeta tracking API is experiencing server issues. Please try again in a few minutes." },
          { status: 503 }
        );
      } else if (packetaRes.status === 404) {
        return NextResponse.json(
          { error: "Shipment not found. Please check the tracking number." },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: `Failed to get tracking info: ${packetaRes.status} ${packetaRes.statusText}` },
        { status: 500 }
      );
    }

    const trackingData = await packetaRes.json();
    console.log("✅ Packeta tracking data retrieved:", trackingData);

    // v5 returns array of tracking data
    const packetData = Array.isArray(trackingData) ? trackingData[0] : trackingData;

    // Normalize the response format
    const normalizedData = {
      packetaId,
      status: packetData?.status || packetData?.state?.name || 'unknown',
      statusText: packetData?.status_text || packetData?.status_description || packetData?.state?.description || 'Neznámý stav',
      currentLocation: packetData?.current_location || packetData?.location,
      estimatedDelivery: packetData?.estimated_delivery,
      deliveredAt: packetData?.delivered_at,
      lastUpdate: packetData?.updatedAt || packetData?.updated_at,
      trackingUrl: packetData?.tracking_url || `https://www.zasilkovna.cz/sledovani/${packetaId}`,
      trackingHistory: packetData?.history || packetData?.events || []
    };

    return NextResponse.json(normalizedData);

  } catch (error) {
    console.error("❌ Error tracking Packeta shipment:", error);
    return NextResponse.json(
      { error: "Failed to track shipment" },
      { status: 500 }
    );
  }
}