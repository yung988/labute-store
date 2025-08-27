import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
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
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

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

      if (items.length > 0) {
        let calculatedWeight = 0;

        for (const item of items) {
          // Skip shipping items
          if (item.description?.toLowerCase().includes('shipping') ||
              item.description?.toLowerCase().includes('doprava')) {
            continue;
          }

          // Find product by name (case-insensitive partial match)
          const { data: product } = await supabaseAdmin
            .from('products')
            .select('weight_kg')
            .ilike('name', `%${item.description}%`)
            .single();

          if (product?.weight_kg) {
            // Convert kg to grams and multiply by quantity
            calculatedWeight += (product.weight_kg * 1000) * item.quantity;
          }
        }

        if (calculatedWeight > 0) {
          totalWeightGrams = Math.round(calculatedWeight);
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not calculate weight from items, using default:', error);
  }

  console.log(`📦 Calculated weight for order ${orderId}: ${totalWeightGrams}g`);

  // Create shipment via Packeta REST API (XML format as per documentation)
  const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<createPacket>
  <apiPassword>${process.env.PACKETA_API_KEY}</apiPassword>
  <packetAttributes>
    <number>${orderId}</number>
    <name>${order.customer_name || ""}</name>
    <surname></surname>
    <email>${order.customer_email || ""}</email>
    <phone>${order.customer_phone || ""}</phone>
    <addressId>${order.packeta_point_id}</addressId>
    <cod>${order.amount_total || 0}</cod>
    <value>${order.amount_total || 0}</value>
    <weight>${totalWeightGrams}</weight>
    <eshop>labute-store</eshop>
  </packetAttributes>
</createPacket>`;

  const packetaResponse = await fetchWithRetry(
    "https://www.zasilkovna.cz/api/rest",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/xml",
        "Accept": "application/xml",
      },
      body: xmlBody,
    }
  );

  if (!packetaResponse.ok) {
    const errorText = await packetaResponse.text();
    console.error("❌ Packeta API error:", {
      status: packetaResponse.status,
      statusText: packetaResponse.statusText,
      snippet: errorText.slice(0, 300)
    });
    return NextResponse.json(
      { error: `Packeta API error: ${packetaResponse.status} ${errorText}` },
      { status: 500 }
    );
  }

  // Parse XML response to get packet ID
  const responseText = await packetaResponse.text();
  console.log("✅ Packeta API success:", responseText);

  // Extract packet ID from XML response (simple regex for now)
  const packetIdMatch = responseText.match(/<id>(\d+)<\/id>/);
  if (!packetIdMatch) {
    return NextResponse.json(
      { error: `Invalid Packeta response - missing ID: ${responseText}` },
      { status: 500 }
    );
  }

  const packetaId = packetIdMatch[1];

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
}