import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

export async function POST(req: NextRequest) {
  const { orderId } = await req.json();

  try {
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
      return NextResponse.json({ error: "No Packeta point specified" }, { status: 400 });
    }

    // Split customer name into first and last name
    const nameParts = (order.customer_name || "").split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Debug: Check if API key is set
    console.log("🔍 Packeta API Debug:", {
      hasApiKey: !!process.env.PACKETA_API_KEY,
      hasEshopId: !!process.env.PACKETA_ESHOP_ID,
      apiUrl: process.env.PACKETA_API_URL,
      packetaPointId: order.packeta_point_id
    });

    if (!process.env.PACKETA_API_KEY) {
      return NextResponse.json({ error: "PACKETA_API_KEY not configured" }, { status: 500 });
    }

    // Use Packeta v3 JSON API (official host)
    const packetData = {
      recipient: {
        name: `${firstName} ${lastName}`.trim(),
        street: "", // Not required for pickup points
        city: "", // Not required for pickup points  
        zip: "", // Not required for pickup points
        phone: order.customer_phone || "",
        email: order.customer_email || ""
      },
      // Some docs/plugins refer to pickup branch as addressId; keep both for compatibility
      branch_id: parseInt(order.packeta_point_id),
      addressId: parseInt(order.packeta_point_id),
      cod: 0, // No cash on delivery
      weight: 1.0,
      value: parseFloat((order.amount_total / 100).toFixed(2)),
      currency: "CZK",
      eshop: process.env.PACKETA_ESHOP_ID,
      number: orderId,
      note: `Order ${orderId.slice(-8)}`
    } as Record<string, unknown>;

    console.log("🔍 Packeta JSON payload:", JSON.stringify(packetData, null, 2));

    // Use correct Packeta REST API endpoint for packet creation (2024)
    const endpoints = [
      'https://api.packeta.com/v1/packet',
      'https://api.packeta.com/v3/packet' // fallback
    ];
    
    let packetaResponse: Response | null = null;
    let lastError: string = '';
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔄 Trying Packeta endpoint: ${endpoint}`);
        packetaResponse = await fetchWithRetry(
          endpoint,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.PACKETA_API_KEY}`,
              "Content-Type": "application/json",
              "Accept": "application/json",
              "User-Agent": "labute-store/admin (Packeta create packet)"
            },
            body: JSON.stringify(packetData),
          },
          { retries: 3, timeoutMs: 25000, backoffMs: 1500 }
        );
        
        if (packetaResponse.ok) {
          console.log(`✅ Success with endpoint: ${endpoint}`);
          break;
        } else {
          const errorText = await packetaResponse.text();
          lastError = `${endpoint}: ${packetaResponse.status} ${errorText}`;
          console.log(`❌ Failed with ${endpoint}: ${packetaResponse.status}`);
          packetaResponse = null;
        }
      } catch (error) {
        lastError = `${endpoint}: ${error}`;
        console.log(`❌ Error with ${endpoint}:`, error);
        packetaResponse = null;
      }
    }
    
    if (!packetaResponse) {
      console.error("❌ All Packeta endpoints failed:", lastError);
      return NextResponse.json(
        { error: `All Packeta endpoints failed: ${lastError}` },
        { status: 503 }
      );
    }

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

  } catch (error) {
    console.error("Error creating Packeta shipment:", error);
    return NextResponse.json(
      { error: "Failed to create shipment" },
      { status: 500 }
    );
  }
}