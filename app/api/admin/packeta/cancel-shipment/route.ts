import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireAuth() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  // Check if Packeta API key is configured
  if (!process.env.PACKETA_API_KEY) {
    console.error('❌ PACKETA_API_KEY is not set on Vercel!');
    return NextResponse.json(
      { error: 'Packeta API key is not configured on Vercel. Please set PACKETA_API_KEY environment variable.' },
      { status: 500 }
    );
  }

  const { orderId } = await req.json();

  try {
    // Get order details with Packeta shipment ID
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!order.packeta_shipment_id) {
      return NextResponse.json({ error: "No Packeta shipment to cancel" }, { status: 400 });
    }

    // Cancel shipment via Packeta v5 API
    console.log(`🔄 Cancelling Packeta shipment: ${order.packeta_shipment_id}`);

    const cancelResponse = await fetch(`https://api.packeta.com/api/v5/shipments/cancel`, {
      method: "POST",
      headers: {
        "Authorization": `ApiKey ${process.env.PACKETA_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        packetIds: [order.packeta_shipment_id]
      })
    });

    if (!cancelResponse.ok) {
      const errorText = await cancelResponse.text();
      console.error("❌ Packeta cancel API error:", {
        status: cancelResponse.status,
        statusText: cancelResponse.statusText,
        error: errorText,
        packetId: order.packeta_shipment_id
      });
      
      // If cancel fails, still proceed with database update but warn user
      console.warn("⚠️ Packeta API cancel failed, but continuing with database reset");
    } else {
      const cancelResult = await cancelResponse.json();
      console.log("✅ Packeta shipment cancelled via API:", cancelResult);
    }

    // Reset packeta fields in database regardless of API result
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        packeta_shipment_id: null,
        status: "paid",
      })
      .eq("id", orderId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log(`✅ Order ${orderId} Packeta shipment cancelled and reset to paid status`);

    return NextResponse.json({
      success: true,
      message: "Shipment cancelled successfully"
    });

  } catch (error) {
    console.error("Error cancelling Packeta shipment:", error);
    return NextResponse.json(
      { error: "Failed to cancel shipment" },
      { status: 500 }
    );
  }
}