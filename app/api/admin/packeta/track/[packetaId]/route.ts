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

  try {
    console.log(`🔍 Tracking Packeta shipment: ${packetaId}`);

    // Call Packeta v3 tracking API
    const packetaRes = await fetch(`https://api.packeta.com/v3/packet/${packetaId}/tracking`, {
      headers: {
        Authorization: `ApiKey ${process.env.PACKETA_API_KEY}`,
        Accept: "application/json",
      },
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

    // Normalize the response format
    const normalizedData = {
      packetaId,
      status: trackingData.status || trackingData.state?.name || 'unknown',
      statusText: trackingData.status_text || trackingData.status_description || trackingData.state?.description || 'Neznámý stav',
      currentLocation: trackingData.current_location || trackingData.location,
      estimatedDelivery: trackingData.estimated_delivery,
      deliveredAt: trackingData.delivered_at,
      lastUpdate: trackingData.updatedAt || trackingData.updated_at,
      trackingUrl: trackingData.tracking_url || `https://www.zasilkovna.cz/sledovani/${packetaId}`,
      trackingHistory: trackingData.history || trackingData.events || []
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