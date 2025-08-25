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

    // Use modern Packeta v3 JSON API
    const packetData = {
      recipient: {
        name: `${firstName} ${lastName}`.trim(),
        street: "", // Not required for pickup points
        city: "", // Not required for pickup points  
        zip: "", // Not required for pickup points
        phone: order.customer_phone || "",
        email: order.customer_email || ""
      },
      branch_id: parseInt(order.packeta_point_id),
      cod: 0, // No cash on delivery
      weight: 1.0,
      value: parseFloat((order.amount_total / 100).toFixed(2)),
      currency: "CZK",
      eshop: process.env.PACKETA_ESHOP_ID,
      number: orderId,
      note: `Order ${orderId.slice(-8)}`
    };

    console.log("🔍 Packeta JSON payload:", JSON.stringify(packetData, null, 2));

    const packetaResponse = await fetch(`https://www.zasilkovna.cz/api/v3/packet`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.PACKETA_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(packetData),
    });

    if (!packetaResponse.ok) {
      const errorText = await packetaResponse.text();
      console.error("❌ Packeta API error:", {
        status: packetaResponse.status,
        statusText: packetaResponse.statusText,
        error: errorText
      });
      return NextResponse.json(
        { error: `Packeta API error: ${packetaResponse.status} ${errorText}` },
        { status: 500 }
      );
    }

    // Parse JSON response to get packet ID
    const responseData = await packetaResponse.json();
    console.log("✅ Packeta API success:", responseData);
    
    if (!responseData.id) {
      return NextResponse.json(
        { error: `Invalid Packeta response - missing ID: ${JSON.stringify(responseData)}` },
        { status: 500 }
      );
    }

    const packetaId = responseData.id.toString();

    // Update order with Packeta ID
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        packeta_shipment_id: packetaId,
        status: "processing",
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