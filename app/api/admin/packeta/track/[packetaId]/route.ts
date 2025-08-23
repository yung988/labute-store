import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ packetaId: string }> },
) {
  const { packetaId } = await context.params;

  try {
    // Get tracking info from Packeta API
    const trackingResponse = await fetch(
      `${process.env.PACKETA_API_URL}/packets/${packetaId}`,
      {
        headers: {
          "Authorization": `Bearer ${process.env.PACKETA_API_KEY}`,
        },
      }
    );

    if (!trackingResponse.ok) {
      return NextResponse.json(
        { error: "Failed to track shipment" },
        { status: 500 }
      );
    }

    const trackingData = await trackingResponse.json();

    return NextResponse.json({
      status: trackingData.state?.name || "Unknown",
      lastUpdate: trackingData.updatedAt,
    });

  } catch (error) {
    console.error("Error tracking Packeta shipment:", error);
    return NextResponse.json(
      { error: "Failed to track shipment" },
      { status: 500 }
    );
  }
}