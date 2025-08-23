import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const { orderId } = await req.json();

  try {
    // Get order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!order.packeta_point_id) {
      return NextResponse.json({ error: "No Packeta point specified" }, { status: 400 });
    }

    // Create Packeta shipment
    const packetaResponse = await fetch(`${process.env.PACKETA_API_URL}/packets/`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.PACKETA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: orderId,
        name: order.customer_name,
        surname: "", // Split name if needed
        email: order.customer_email,
        phone: order.customer_phone,
        addressId: order.packeta_point_id,
        value: order.amount_total / 100, // Convert from cents
        weight: 1.0, // Default weight in kg
        eshop: process.env.PACKETA_ESHOP_ID,
      }),
    });

    if (!packetaResponse.ok) {
      const errorText = await packetaResponse.text();
      return NextResponse.json(
        { error: `Packeta API error: ${errorText}` },
        { status: 500 }
      );
    }

    const packetaData = await packetaResponse.json();

    // Update order with Packeta ID
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        packeta_shipment_id: packetaData.id,
        status: "shipped",
      })
      .eq("id", orderId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      packetaId: packetaData.id,
    });

  } catch (error) {
    console.error("Error creating Packeta shipment:", error);
    return NextResponse.json(
      { error: "Failed to create shipment" },
      { status: 500 }
    );
  }
}