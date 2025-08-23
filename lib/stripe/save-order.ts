import { supabaseAdmin } from "@/lib/supabase/admin";
import type { StripeCheckoutSession } from "./types";

export default async function saveOrderToDb(session: StripeCheckoutSession) {
  // Generate unique order ID
  const orderId = crypto.randomUUID();
  
  // Extract customer info from metadata
  const firstName = session.metadata?.customer_first_name;
  const lastName = session.metadata?.customer_last_name;
  const toTitle = (v?: string | null) => {
    if (!v) return v ?? undefined;
    return v
      .trim()
      .toLowerCase()
      .replace(/(^|\s|[-'])\p{L}/gu, (m) => m.toUpperCase());
  };
  const customerName = firstName && lastName ? `${toTitle(firstName)} ${toTitle(lastName)}` : null;
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

  // Fetch line items from Stripe (authoritative source)
  let normalizedItems: Array<{ description: string; quantity: number; amount_total: number } > = [];
  try {
    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${session.id}/line_items`,
      {
        headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
      }
    );
    if (res.ok) {
      const json = await res.json();
      const data = Array.isArray(json?.data) ? json.data : [];
      normalizedItems = data.map((li: any) => ({
        description: li.description ?? '',
        quantity: typeof li.quantity === 'number' ? li.quantity : Number(li.quantity) || 0,
        amount_total: typeof li.amount_total === 'number' ? li.amount_total : Number(li.amount_total) || 0,
      }));
    } else {
      console.error('⚠️ Failed to fetch Stripe line_items', await res.text());
    }
  } catch (e) {
    console.error('⚠️ Error fetching Stripe line_items', e);
  }

  console.log("🔍 Debug webhook data:", {
    sessionId: session.id,
    metadata: session.metadata,
    customFields: session.custom_fields,
    customerName,
    customerPhone,
    packetaPointId,
    itemsCount: normalizedItems.length
  });
  
  const { error } = await supabaseAdmin.from("orders").insert({
    id: orderId,
    stripe_session_id: session.id,
    customer_email: session.customer_details?.email,
    customer_name: customerName,
    customer_phone: customerPhone,
    packeta_point_id: packetaPointId,
    status: "paid",
    items: JSON.stringify(normalizedItems),
    amount_total: session.amount_total,
  });

  if (error) {
    throw new Error(`Supabase error: ${error.message}`);
  }

  console.log("✅ Order saved:", session.id);
}