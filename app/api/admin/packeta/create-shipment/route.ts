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

    // Split customer name into first and last name
    const nameParts = (order.customer_name || "").split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Debug: Check if API key is set
    console.log("🔍 Packeta API Debug:", {
      hasApiKey: !!process.env.PACKETA_API_KEY,
      hasEshopId: !!process.env.PACKETA_ESHOP_ID,
      apiUrl: process.env.PACKETA_API_URL,
      packetaPointId: order.packeta_point_id
    });

    if (!process.env.PACKETA_API_KEY) {
      return NextResponse.json({ error: "PACKETA_API_KEY not configured" }, { status: 500 });
    }

    // Use correct Packeta API endpoint with XML format (based on Perplexity research)
    const packetXml = `<?xml version="1.0" encoding="utf-8"?>
<packetImport>
  <apiPassword>${process.env.PACKETA_API_KEY}</apiPassword>
  <packet>
    <number>${orderId}</number>
    <name>${firstName}</name>
    <surname>${lastName}</surname>
    <email>${order.customer_email}</email>
    <phone>${order.customer_phone}</phone>
    <addressId>${order.packeta_point_id}</addressId>
    <cod>0</cod>
    <value>${(order.amount_total / 100).toFixed(2)}</value>
    <currency>CZK</currency>
    <weight>1.0</weight>
    <eshop>${process.env.PACKETA_ESHOP_ID}</eshop>
  </packet>
</packetImport>`;

    console.log("🔍 Packeta XML:", packetXml);

    const packetaResponse = await fetch(`https://www.zasilkovna.cz/api/createpacket`, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml",
      },
      body: packetXml,
    });

    const responseText = await packetaResponse.text();
    
    if (!packetaResponse.ok) {
      return NextResponse.json(
        { error: `Packeta API error: ${responseText}` },
        { status: 500 }
      );
    }

    // Parse XML response to get packet ID
    const idMatch = responseText.match(/<id>(\d+)<\/id>/);
    if (!idMatch) {
      return NextResponse.json(
        { error: `Invalid Packeta response: ${responseText}` },
        { status: 500 }
      );
    }

    const packetaId = idMatch[1];

    // Update order with Packeta ID
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        packeta_shipment_id: packetaId,
        status: "shipped",
      })
      .eq("id", orderId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      packetaId: packetaId,
    });

  } catch (error) {
    console.error("Error creating Packeta shipment:", error);
    return NextResponse.json(
      { error: "Failed to create shipment" },
      { status: 500 }
    );
  }
}