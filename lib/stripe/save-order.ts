import { supabaseAdmin } from "@/lib/supabase/admin";
import type { StripeCheckoutSession } from "./types";
import { decreaseInventory, type CartItemForInventory } from "@/lib/inventory";

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
  type StripeProduct = {
    id: string;
    name?: string;
    metadata?: Record<string, string>;
  };
  
  type StripeCheckoutLineItem = {
    description?: string | null;
    quantity?: number | null;
    amount_total?: number | null;
    price?: {
      product?: string | StripeProduct;
      nickname?: string;
    };
  };
  type StripeList<T> = { data?: T[] };
  let normalizedItems: Array<{ description: string; quantity: number; amount_total: number; productId?: string; size?: string } > = [];
  
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
      normalizedItems = data
        .filter(li => {
          // Filtrujeme shipping položky (obsahují "Zásilkovna" nebo "doručení")
          const description = li.description || (typeof li.price?.product === 'object' ? li.price.product.name : li.price?.product) || li.price?.nickname || '';
          return !description.toLowerCase().includes('zásilkovna') && 
                 !description.toLowerCase().includes('doručení') &&
                 !description.toLowerCase().includes('doprava');
        })
        .map((li) => {
          const productObj = typeof li.price?.product === 'object' ? li.price.product : null;
          const productName = typeof li.price?.product === 'string' ? li.price.product : productObj?.name;
          const description = li.description || productName || li.price?.nickname || 'Unknown product';
          
          // Extrahujeme velikost z description (formát: "Velikost: M")
          const sizeMatch = typeof description === 'string' ? description.match(/Velikost:\s*([A-Z]+)/i) : null;
          let size = sizeMatch ? sizeMatch[1] : undefined;
          
          // Extrahujeme product ID a size z metadata pokud jsou dostupné
          let productId: string | undefined;
          if (productObj?.metadata) {
            productId = productObj.metadata.product_id;
            size = productObj.metadata.size || size;
          }
          
          // Fallback - pokusíme se extrahovat product ID z názvu
          if (!productId && typeof description === 'string') {
            if (description.toLowerCase().includes('polo')) {
              productId = 'POLO';
            } else if (description.toLowerCase().includes('hood') || description.toLowerCase().includes('mikina')) {
              productId = 'HOOD';
            }
          }
          
          return {
            description: typeof description === 'string' ? description : 'Unknown product',
            quantity: typeof li.quantity === 'number' ? li.quantity : 0,
            amount_total: typeof li.amount_total === 'number' ? li.amount_total : 0,
            productId,
            size
          };
        });
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

  // Zjistíme částku dopravy: preferuj session.shipping_cost.amount_total, fallback metadata.shipping_amount
  const shippingAmount = typeof session.shipping_cost?.amount_total === 'number'
    ? session.shipping_cost!.amount_total
    : (session.metadata?.shipping_amount ? parseInt(session.metadata.shipping_amount, 10) : undefined);

  // Připravíme payload pro DB insert
  const basePayload: Record<string, unknown> = {
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
  };
  if (typeof shippingAmount === 'number' && !Number.isNaN(shippingAmount)) {
    (basePayload as any).shipping_amount = shippingAmount;
  }

  // Uložíme objednávku do databáze (s rezervním pokusem bez shipping_amount pokud sloupec neexistuje)
  let insertError: { message: string } | null = null;
  {
    const { error } = await supabaseAdmin.from("orders").insert(basePayload);
    insertError = error as any;
  }

  if (insertError) {
    const msg = insertError.message?.toLowerCase?.() || '';
    const colMissing = msg.includes('column') && msg.includes('shipping_amount');
    if (colMissing) {
      try {
        const fallbackPayload = { ...basePayload } as any;
        delete fallbackPayload.shipping_amount;
        const { error: retryError } = await supabaseAdmin.from("orders").insert(fallbackPayload);
        if (retryError) {
          throw new Error(`Supabase error (retry): ${retryError.message}`);
        }
      } catch (e: any) {
        throw new Error(`Supabase error: ${e?.message || e}`);
      }
    } else {
      throw new Error(`Supabase error: ${insertError.message}`);
    }
  }

  console.log("✅ Order saved:", session.id);

  // Snížíme sklad pro objednané položky
  let inventoryItems: CartItemForInventory[] = [];
  
  // Nejdříve zkusíme použít cart_items z metadata (přesnější)
  if (session.metadata?.cart_items) {
    try {
      const cartItems = JSON.parse(session.metadata.cart_items);
      inventoryItems = cartItems.filter((item: { productId?: string; size?: string }) => item.productId && item.size);
      console.log("📦 Using cart items from metadata:", inventoryItems);
    } catch (e) {
      console.error("⚠️ Failed to parse cart_items from metadata:", e);
    }
  }
  
  // Fallback na parsování Stripe line items
  if (inventoryItems.length === 0) {
    inventoryItems = normalizedItems
      .filter(item => item.productId && item.size) // Pouze položky s product ID a velikostí
      .map(item => ({
        productId: item.productId!,
        size: item.size!,
        quantity: item.quantity,
        name: item.description
      }));
    console.log("📦 Using parsed line items for inventory:", inventoryItems);
  }

  if (inventoryItems.length > 0) {
    console.log("📦 Updating inventory for items:", inventoryItems);
    
    const inventoryResult = await decreaseInventory(inventoryItems);
    
    if (!inventoryResult.success) {
      console.error("❌ Failed to update inventory:", inventoryResult.error);
      // Poznámka: Objednávka je již uložena, ale sklad se neaktualizoval
      // V produkci bychom mohli chtít rollback nebo notifikaci admina
    } else {
      console.log("✅ Inventory updated successfully:", inventoryResult.updatedItems);
    }
  } else {
    console.warn("⚠️ No inventory items found to update (missing productId or size)");
  }
}