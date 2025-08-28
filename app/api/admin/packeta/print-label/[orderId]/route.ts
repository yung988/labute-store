import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await context.params;

  // Check if Packeta API key is configured
  if (!process.env.PACKETA_API_KEY) {
    console.error('❌ PACKETA_API_KEY is not set on Vercel!');
    return NextResponse.json(
      { error: 'Packeta API key is not configured on Vercel. Please set PACKETA_API_KEY environment variable.' },
      { status: 500 }
    );
  }

  try {
    // Get order with Packeta shipment ID
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("packeta_shipment_id")
      .eq("id", orderId)
      .single();

    if (orderError || !order || !order.packeta_shipment_id) {
      console.error("Print label error:", {
        orderId,
        orderError: orderError?.message,
        hasOrder: !!order,
        hasShipmentId: !!order?.packeta_shipment_id,
        shipmentId: order?.packeta_shipment_id
      });
      return NextResponse.json(
        { error: "Order or Packeta shipment not found" },
        { status: 404 }
      );
    }

    // Get label from Packeta v5 API with timeout and retry
    const MAX_RETRIES = 3;
    const TIMEOUT_MS = 30000;
    const BASE_BACKOFF_MS = 1000;

    let labelResponse: Response | undefined;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`🔄 Packeta label API attempt ${attempt}/${MAX_RETRIES} for ${order.packeta_shipment_id}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        labelResponse = await fetch(`https://api.packeta.com/v5/packets/${order.packeta_shipment_id}/label`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${process.env.PACKETA_API_KEY}`,
            "Accept": "application/pdf",
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Check if response is successful (2xx) or client error (4xx) - don't retry these
        if (labelResponse.ok || labelResponse.status < 500) {
          break; // Success or client error - exit retry loop
        }

        // For server errors (5xx including 504), retry
        const errorText = await labelResponse.text();
        console.log(`⏳ Packeta label API returned ${labelResponse.status}, will retry: ${errorText.substring(0, 100)}...`);

        if (attempt < MAX_RETRIES) {
          const backoffTime = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
          console.log(`⏳ Waiting ${backoffTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }

      } catch (error) {
        const err = error as Error;
        lastError = err;
        console.log(`❌ Packeta label API attempt ${attempt} failed:`, err.message);

        if (attempt < MAX_RETRIES) {
          const backoffTime = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
          console.log(`⏳ Network error, waiting ${backoffTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }
    }

    // Check if we got any response
    if (!labelResponse) {
      const errorMsg = lastError ? lastError.message : 'Unknown network error';
      console.error('❌ Packeta label API failed after all retries:', errorMsg);
      return NextResponse.json(
        { error: `Packeta label API is temporarily unavailable after ${MAX_RETRIES} attempts. Please try again in a few minutes.` },
        { status: 503 }
      );
    }

    if (!labelResponse.ok) {
      const errorText = await labelResponse.text();
      console.error("Packeta label API error:", {
        status: labelResponse.status,
        statusText: labelResponse.statusText,
        error: errorText,
        packetId: order.packeta_shipment_id
      });

      // Return user-friendly error messages
      if (labelResponse.status === 504) {
        return NextResponse.json(
          { error: "Packeta label API is temporarily unavailable (gateway timeout). Please try again in a few minutes." },
          { status: 503 }
        );
      } else if (labelResponse.status >= 500) {
        return NextResponse.json(
          { error: "Packeta label API is experiencing server issues. Please try again in a few minutes." },
          { status: 503 }
        );
      } else if (labelResponse.status === 404) {
        return NextResponse.json(
          { error: "Shipment not found. Please check if the shipment exists in Packeta system." },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: `Failed to get label from Packeta: ${labelResponse.status} ${labelResponse.statusText}` },
        { status: 500 }
      );
    }

    const pdfBuffer = await labelResponse.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="packeta-label-${orderId}.pdf"`,
      },
    });

  } catch (error) {
    console.error("Error getting Packeta label:", error);
    return NextResponse.json(
      { error: "Failed to get label" },
      { status: 500 }
    );
  }
}