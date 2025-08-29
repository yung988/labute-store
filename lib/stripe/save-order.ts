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
  
  // Extract delivery method and address info from metadata
  const deliveryMethod = session.metadata?.delivery_method || 'pickup';
  
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

  // Extract home delivery address from metadata
  const deliveryAddress = session.metadata?.delivery_address;
  const deliveryCity = session.metadata?.delivery_city;
  const deliveryPostalCode = session.metadata?.delivery_postal_code;

  // Fetch line items from Stripe (authoritative source)
  type StripeCheckoutLineItem = {
    description?: string | null;
    quantity?: number | null;
    amount_total?: number | null;
    price?: {
      product?: string;
      nickname?: string;
    };
  };
  type StripeList<T> = { data?: T[] };
  let normalizedItems: Array<{ description: string; quantity: number; amount_total: number } > = [];
  try {
    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${session.id}/line_items?expand[]=data.price.product`,
      {
        headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
      }
    );
    if (res.ok) {
      const json = (await res.json()) as StripeList<StripeCheckoutLineItem>;
      const data: StripeCheckoutLineItem[] = Array.isArray(json?.data) ? json.data : [];
      normalizedItems = data.map((li) => ({
        description: li.description || li.price?.product || li.price?.nickname || 'Unknown product',
        quantity: typeof li.quantity === 'number' ? li.quantity : 0,
        amount_total: typeof li.amount_total === 'number' ? li.amount_total : 0,
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
    deliveryMethod,
    packetaPointId,
    deliveryAddress,
    deliveryCity,
    deliveryPostalCode,
    itemsCount: normalizedItems.length
  });
  
  // Extract invoice ID if available
  let invoiceId = null;
  if (session.invoice) {
    if (typeof session.invoice === 'string') {
      invoiceId = session.invoice;
    } else if (typeof session.invoice === 'object' && session.invoice.id) {
      invoiceId = session.invoice.id;
    }
  }

  const { error } = await supabaseAdmin.from("orders").insert({
    id: orderId,
    stripe_session_id: session.id,
    stripe_invoice_id: invoiceId,
    customer_email: session.customer_details?.email,
    customer_name: customerName,
    customer_phone: customerPhone,
    packeta_point_id: packetaPointId,
    delivery_method: deliveryMethod,
    delivery_address: deliveryAddress,
    delivery_city: deliveryCity,
    delivery_postal_code: deliveryPostalCode,
    delivery_country: 'CZ',
    status: "paid",
    items: JSON.stringify(normalizedItems),
    amount_total: session.amount_total,
  });

  if (error) {
    throw new Error(`Supabase error: ${error.message}`);
  }

  console.log("✅ Order saved:", session.id);
}