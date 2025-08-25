import { NextResponse } from "next/server";
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

export async function POST() {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  try {
    // Get all orders with packeta_shipment_id that are not shipped
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("id, packeta_shipment_id, status")
      .not("packeta_shipment_id", "is", null)
      .neq("status", "shipped");

    if (ordersError) {
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: "No shipments to cancel",
        cancelled: 0
      });
    }

    console.log(`🔄 Attempting to cancel ${orders.length} Packeta shipments`);

    // Collect all packet IDs
    const packetIds = orders.map(order => order.packeta_shipment_id).filter(Boolean);
    
    let cancelledCount = 0;
    const errors: string[] = [];

    // Cancel via Packeta API in batches
    if (packetIds.length > 0) {
      try {
        const cancelResponse = await fetch("https://www.zasilkovna.cz/api/v3/packet/cancel", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.PACKETA_API_KEY}`,
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({
            packet_ids: packetIds
          }),
        });

        if (cancelResponse.ok) {
          const result = await cancelResponse.json();
          console.log("✅ Packeta bulk cancel success:", result);
          cancelledCount = packetIds.length;
        } else {
          const errorText = await cancelResponse.text();
          console.error("❌ Packeta bulk cancel failed:", errorText);
          errors.push(`Packeta API error: ${cancelResponse.status} ${errorText}`);
        }
      } catch (error) {
        console.error("❌ Packeta API call failed:", error);
        errors.push(`API call failed: ${error}`);
      }
    }

    // Reset database records regardless of API result
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        packeta_shipment_id: null,
        status: "paid",
      })
      .not("packeta_shipment_id", "is", null)
      .neq("status", "shipped");

    if (updateError) {
      errors.push(`Database update failed: ${updateError.message}`);
    }

    console.log(`✅ Bulk cancelled ${orders.length} orders in database`);

    return NextResponse.json({
      success: true,
      message: `Processed ${orders.length} shipments`,
      cancelled: cancelledCount,
      database_reset: orders.length,
      errors: errors.length > 0 ? errors : undefined,
      order_ids: orders.map(o => o.id)
    });

  } catch (error) {
    console.error("Error in bulk cancel:", error);
    return NextResponse.json(
      { error: "Failed to cancel shipments" },
      { status: 500 }
    );
  }
}