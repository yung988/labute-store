import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  console.log('🚀 Starting create-shipment for order:', req.url);

  // Temporary: Packeta API has outage (504 errors), disable until fixed
  // return NextResponse.json(
  //   { error: "Packeta API temporarily unavailable - try again later" },
  //   { status: 503 }
  // );

  // TODO: Uncomment and update to v5 when ready

  // Simple fetch with timeout and retries for transient Packeta issues (e.g., 5xx/504)
  async function fetchWithRetry(
    url: string,
    init: RequestInit,
    opts: { retries?: number; timeoutMs?: number; backoffMs?: number } = {}
  ) {
    const { retries = 5, timeoutMs = 30000, backoffMs = 2000 } = opts;
    let attempt = 0;
    let lastErr: unknown;
    while (attempt <= retries) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
        lastErr = new Error(`HTTP ${res.status}`);
      } else {
        clearTimeout(timer);
        return res;
      }
    } catch (e) {
      lastErr = e;
    } finally {
      clearTimeout(timer);
    }
    if (attempt === retries) break;
    let wait = backoffMs * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
    if (lastErr instanceof Error && /HTTP 429/.test(lastErr.message)) {
      wait = Math.max(wait, 3000);
    }
    await new Promise((r) => setTimeout(r, wait));
    attempt++;
  }
  if (lastErr instanceof Error) throw lastErr;
  throw new Error(String(lastErr));
  }

  const { orderId } = await req.json();

  // Get order details
  console.log('📋 Getting order details for:', orderId);
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    console.error('❌ Order not found:', orderError);
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  console.log('✅ Order found:', {
    id: order.id,
    amount_total: order.amount_total,
    packeta_point_id: order.packeta_point_id,
    items_length: order.items?.length || 0
  });

  if (!order.packeta_point_id) {
    return NextResponse.json({ error: "No Packeta point selected for this order" }, { status: 400 });
  }

  // Calculate total weight from order items
  let totalWeightGrams = 500; // Default 500g fallback
  try {
    if (order.items && typeof order.items === 'string') {
      const items = JSON.parse(order.items) as Array<{
        description: string;
        quantity: number;
        amount_total: number;
      }>;

      console.log(`🔍 Processing ${items.length} items for weight calculation`);
      console.log(`📋 Raw items:`, JSON.stringify(items, null, 2));

      if (items.length > 0) {
        let calculatedWeight = 0;

        for (const item of items) {
          console.log(`📦 Processing item: "${item.description}", qty: ${item.quantity}, amount: ${item.amount_total}`);

          // Skip shipping items
          if (item.description?.toLowerCase().includes('shipping') ||
              item.description?.toLowerCase().includes('doprava') ||
              item.description?.toLowerCase().includes('zásilkovna')) {
            console.log(`⏭️ Skipping shipping item: ${item.description}`);
            continue;
          }

          // Find product by name (case-insensitive partial match)
          const { data: product, error: productError } = await supabaseAdmin
            .from('products')
            .select('name, weight_g')
            .ilike('name', `%${item.description}%`)
            .single();

          if (productError) {
            console.warn(`⚠️ Product not found for: "${item.description}"`, productError);
            continue;
          }

          if (product?.weight_g) {
            // Weight is already in grams, just multiply by quantity
            const itemWeight = product.weight_g * item.quantity;
            calculatedWeight += itemWeight;
            console.log(`✅ Found product: "${product.name}", weight_g: ${product.weight_g}, quantity: ${item.quantity}, item weight: ${itemWeight}g, running total: ${calculatedWeight}g`);
          } else {
            console.warn(`⚠️ Product "${product?.name}" found but no weight_g`);
          }
        }

        console.log(`📊 Total calculated weight before capping: ${calculatedWeight}g`);

        if (calculatedWeight > 0) {
          // Cap weight at 30kg (Packeta limit) and ensure minimum 100g
          totalWeightGrams = Math.max(100, Math.min(30000, Math.round(calculatedWeight)));
          console.log(`✂️ Weight after capping: ${totalWeightGrams}g`);
        } else {
          console.log(`⚠️ No valid products found, using default weight: ${totalWeightGrams}g`);
        }
      }
    } else {
      console.log(`⚠️ No items found in order, using default weight: ${totalWeightGrams}g`);
    }
  } catch (error) {
    console.warn('⚠️ Could not calculate weight from items, using default:', error);
    console.error('Error details:', error);
  }

  console.log(`📦 Final weight for order ${orderId}: ${totalWeightGrams}g`);

  // TEMPORARY: Return debug info instead of calling Packeta API
  return NextResponse.json({
    debug: {
      orderId,
      totalWeightGrams,
      orderItems: order.items,
      packetaPointId: order.packeta_point_id,
      amountTotal: order.amount_total
    },
    message: "DEBUG MODE: Check console for detailed logs"
  });
}