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

  // Create shipment via Packeta v5 API
  const packetaResponse = await fetchWithRetry(
    `${process.env.PACKETA_API_URL}/api/v5/shipments`,
    {
      method: "POST",
      headers: {
        "Authorization": `ApiKey ${process.env.PACKETA_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        packetAttributes: {
          number: orderId,
          name: order.customer_name || "",
          surname: "", // Packeta expects separate name/surname, but we have full name
          email: order.customer_email || "",
          phone: order.customer_phone || "",
          addressId: order.packeta_point_id,
          cod: order.amount_total || 0,
          value: order.amount_total || 0,
          weight: 1, // Default weight, should be calculated from items
          eshop: "labute-store"
        }
      }),
    }
  );

  if (!packetaResponse.ok) {
    const contentType = packetaResponse.headers.get("content-type") || "";
    const xAzureRef = packetaResponse.headers.get("x-azure-ref") || packetaResponse.headers.get("x-azure-ref-originshield") || undefined;
    const errorText = await packetaResponse.text();
    console.error("❌ Packeta API error:", {
      status: packetaResponse.status,
      statusText: packetaResponse.statusText,
      contentType,
      xAzureRef,
      snippet: errorText.slice(0, 300)
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
}