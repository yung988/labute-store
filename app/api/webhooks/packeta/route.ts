import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import sendOrderStatusEmail from "@/lib/stripe/send-status-email";

// Packeta webhook event types
type PacketaWebhookEvent = {
  packet_id: string;
  order_number: string; // This should be our order ID
  status: string;
  status_text: string;
  timestamp: string;
  tracking_url?: string;
};

// Map Packeta status to our internal status
function mapPacketaStatusToOrderStatus(packetaStatus: string): string {
  const statusMap: Record<string, string> = {
    'created': 'processing',
    'handed_to_carrier': 'shipped', 
    'in_transit': 'shipped',
    'ready_for_pickup': 'shipped',
    'delivered': 'delivered',
    'returned': 'returned',
    'cancelled': 'cancelled'
  };
  
  return statusMap[packetaStatus.toLowerCase()] || 'processing';
}

export async function POST(req: NextRequest) {
  try {
    // Log the incoming webhook for debugging
    const body = await req.text();
    console.log("📦 Packeta webhook received:", {
      headers: Object.fromEntries(req.headers.entries()),
      body: body
    });

    // Parse the webhook payload
    let webhookData: PacketaWebhookEvent;
    try {
      webhookData = JSON.parse(body);
    } catch (parseError) {
      console.error("❌ Failed to parse Packeta webhook JSON:", parseError);
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // Validate required fields
    if (!webhookData.packet_id || !webhookData.order_number || !webhookData.status) {
      console.error("❌ Missing required fields in Packeta webhook:", webhookData);
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    console.log("🔍 Processing Packeta webhook:", {
      packet_id: webhookData.packet_id,
      order_number: webhookData.order_number,
      status: webhookData.status,
      status_text: webhookData.status_text
    });

    // Find the order by order ID (stored in order_number field)
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", webhookData.order_number)
      .eq("packeta_shipment_id", webhookData.packet_id)
      .single();

    if (orderError || !order) {
      console.error("❌ Order not found for Packeta webhook:", {
        order_id: webhookData.order_number,
        packet_id: webhookData.packet_id,
        error: orderError?.message
      });
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Map Packeta status to our internal status
    const newStatus = mapPacketaStatusToOrderStatus(webhookData.status);
    const previousStatus = order.status;

    // Only update if status actually changed
    if (newStatus === previousStatus) {
      console.log("ℹ️ Status unchanged, skipping update:", {
        order_id: order.id,
        status: newStatus
      });
      return NextResponse.json({ success: true, message: "Status unchanged" });
    }

    // Update order status and add tracking info
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString()
    };

    // Add tracking URL if provided
    if (webhookData.tracking_url) {
      updateData.packeta_tracking_url = webhookData.tracking_url;
    }

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update(updateData)
      .eq("id", order.id);

    if (updateError) {
      console.error("❌ Failed to update order status:", updateError);
      return NextResponse.json({ error: "Database update failed" }, { status: 500 });
    }

    console.log("✅ Order status updated via Packeta webhook:", {
      order_id: order.id,
      previous_status: previousStatus,
      new_status: newStatus,
      packeta_status: webhookData.status
    });

    // Send status email to customer if they have email
    if (order.customer_email && newStatus !== previousStatus) {
      try {
        await sendOrderStatusEmail({
          id: order.id,
          customer_email: order.customer_email,
          customer_name: order.customer_name,
          status: newStatus,
          items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
          packeta_shipment_id: order.packeta_shipment_id
        }, previousStatus);

        console.log(`📧 Status email sent to ${order.customer_email} for status change: ${previousStatus} → ${newStatus}`);
      } catch (emailError) {
        console.error("❌ Failed to send status email:", emailError);
        // Don't fail the webhook if email fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      order_id: order.id,
      status_updated: `${previousStatus} → ${newStatus}`
    });

  } catch (error) {
    console.error("❌ Packeta webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: "ok", 
    webhook: "packeta",
    timestamp: new Date().toISOString()
  });
}