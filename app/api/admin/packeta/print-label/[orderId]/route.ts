import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await context.params;

  try {
    // Get order with Packeta shipment ID
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("packeta_shipment_id")
      .eq("id", orderId)
      .single();

    if (orderError || !order || !order.packeta_shipment_id) {
      console.error("Print label error:", {
        orderId,
        orderError: orderError?.message,
        hasOrder: !!order,
        hasShipmentId: !!order?.packeta_shipment_id,
        shipmentId: order?.packeta_shipment_id
      });
      return NextResponse.json(
        { error: "Order or Packeta shipment not found" },
        { status: 404 }
      );
    }

    // Get label from Packeta API
    const labelResponse = await fetch(
      `${process.env.PACKETA_API_URL}/packets/${order.packeta_shipment_id}/label.pdf`,
      {
        headers: {
          "Authorization": `Bearer ${process.env.PACKETA_API_KEY}`,
        },
      }
    );

    if (!labelResponse.ok) {
      const errorText = await labelResponse.text();
      console.error("Packeta label API error:", {
        status: labelResponse.status,
        statusText: labelResponse.statusText,
        error: errorText,
        url: `${process.env.PACKETA_API_URL}/packets/${order.packeta_shipment_id}/label.pdf`
      });
      return NextResponse.json(
        { error: `Failed to get label from Packeta: ${labelResponse.status} ${errorText}` },
        { status: 500 }
      );
    }

    const pdfBuffer = await labelResponse.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="packeta-label-${orderId}.pdf"`,
      },
    });

  } catch (error) {
    console.error("Error getting Packeta label:", error);
    return NextResponse.json(
      { error: "Failed to get label" },
      { status: 500 }
    );
  }
}