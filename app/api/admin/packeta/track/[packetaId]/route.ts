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

  // Check if Packeta API key is configured
  if (!process.env.PACKETA_API_KEY) {
    console.error('❌ PACKETA_API_KEY is not set on Vercel!');
    return NextResponse.json(
      { error: 'Packeta API key is not configured on Vercel. Please set PACKETA_API_KEY environment variable.' },
      { status: 500 }
    );
  }

  try {
    console.log(`🔍 Tracking Packeta shipment: ${packetaId}`);

    // Call Packeta v5 tracking API
    const packetaRes = await fetch(`https://api.packeta.com/api/v5/shipments/tracking`, {
      method: "POST",
      headers: {
        Authorization: `ApiKey ${process.env.PACKETA_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        packetIds: [packetaId]
      }),
      next: { revalidate: 0 },
    });

    if (!packetaRes.ok) {
      const errorText = await packetaRes.text();
      console.error("❌ Packeta tracking API error:", {
        status: packetaRes.status,
        statusText: packetaRes.statusText,
        error: errorText,
        packetId: packetaId
      });
      
      return NextResponse.json(
        { error: `Failed to get tracking info: ${packetaRes.status} ${errorText}` },
        { status: packetaRes.status }
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