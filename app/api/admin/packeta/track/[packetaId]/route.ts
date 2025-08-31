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

    // Call Packeta XML tracking API with timeout and retry
    const MAX_RETRIES = 3;
    const TIMEOUT_MS = 30000;
    const BASE_BACKOFF_MS = 1000;

    let packetaRes: Response | undefined;
    let lastError: Error | null = null;

    // Build XML request for packet status
    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<packetStatus>
  <apiPassword>${process.env.PACKETA_API_PASSWORD}</apiPassword>
  <packetId>${packetaId}</packetId>
</packetStatus>`;

    console.log('📄 XML Tracking Request:', xmlBody);

    const apiUrl = process.env.PACKETA_API_URL || 'https://www.zasilkovna.cz/api/rest';

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`🔍 Tracking Packeta shipment: ${packetaId} (attempt ${attempt}/${MAX_RETRIES})`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        packetaRes = await fetch(`${apiUrl}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/xml",
            "Accept": "application/xml",
          },
          body: xmlBody,
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

    const trackingData = await packetaRes.text();
    console.log("✅ Packeta tracking XML response:", trackingData);

    // Parse XML response (simple regex parsing for now)
    const statusMatch = trackingData.match(/<status[^>]*>([^<]+)<\/status>/i);
    const status = statusMatch ? statusMatch[1] : 'unknown';
    
    const packetData = {
      status: status,
      statusText: status,
      raw_xml: trackingData
    };

    // Normalize the response format
    const normalizedData = {
      packetaId,
      status: packetData.status,
      statusText: packetData.statusText,
      currentLocation: null,
      estimatedDelivery: null,
      deliveredAt: null,
      lastUpdate: new Date().toISOString(),
      trackingUrl: `https://tracking.packeta.com/cs/${packetaId.startsWith('Z') ? packetaId : 'Z' + packetaId}`,
      trackingHistory: [],
      rawResponse: packetData.raw_xml
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