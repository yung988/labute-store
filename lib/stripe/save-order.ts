import { supabaseAdmin } from "@/lib/supabase/admin";
import type { StripeCheckoutSession } from "./types";

export default async function saveOrderToDb(session: StripeCheckoutSession) {
  // Generate unique order ID
  const orderId = crypto.randomUUID();
  
  // Extract customer info from metadata
  const firstName = session.metadata?.customer_first_name;
  const lastName = session.metadata?.customer_last_name;
  const customerName = firstName && lastName ? `${firstName} ${lastName}` : null;
  const customerPhone = session.metadata?.customer_phone;
  
  // Extract pickup point ID from custom fields or metadata
  let packetaPointId = null;
  
  // Try custom fields first
  if (session.custom_fields) {
    const pickupPointField = session.custom_fields.find((field) => field.key === 'pickup_point_id');
    if (pickupPointField?.text?.value) {
      packetaPointId = pickupPointField.text.value;
    }
  }
  
  // Fallback to metadata if custom fields don't have it
  if (!packetaPointId && session.metadata?.packeta_point_id) {
    packetaPointId = session.metadata.packeta_point_id;
  }
  
  console.log("🔍 Debug webhook data:", {
    sessionId: session.id,
    metadata: session.metadata,
    customFields: session.custom_fields,
    customerName,
    customerPhone,
    packetaPointId
  });
  
  const { error } = await supabaseAdmin.from("orders").insert({
    id: orderId,
    stripe_session_id: session.id,
    customer_email: session.customer_details?.email,
    customer_name: customerName,
    customer_phone: customerPhone,
    packeta_point_id: packetaPointId,
    status: "paid",
    items: JSON.stringify(session.metadata?.items ?? []),
    amount_total: session.amount_total,
  });

  if (error) {
    throw new Error(`Supabase error: ${error.message}`);
  }

  console.log("✅ Order saved:", session.id);
}