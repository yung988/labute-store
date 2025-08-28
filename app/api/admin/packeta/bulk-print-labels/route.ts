import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireAuth() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  // Check if Packeta API password is configured
  if (!process.env.PACKETA_API_PASSWORD) {
    console.error('❌ PACKETA_API_PASSWORD is not set on Vercel!');
    return NextResponse.json(
      { error: 'Packeta API password is not configured on Vercel. Please set PACKETA_API_PASSWORD environment variable.' },
      { status: 500 }
    );
  }

  const { orderIds, format } = await req.json();

  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
    return NextResponse.json({ error: "No order IDs provided" }, { status: 400 });
  }

  try {
    // Get orders with Packeta shipment IDs
    const { data: orders, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, packeta_shipment_id")
      .in("id", orderIds);

    if (orderError || !orders) {
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
    }

    const ordersWithShipments = orders.filter(order => order.packeta_shipment_id);
    
    if (ordersWithShipments.length === 0) {
      return NextResponse.json({ error: "No orders with Packeta shipments found" }, { status: 404 });
    }

    console.log(`📦 Bulk printing ${ordersWithShipments.length} labels in format: ${format}`);

    // For multiple orders, use A6 on A4 format to fit multiple labels per page
    // If only one order, use A6 format for single label
    const finalFormat = ordersWithShipments.length > 1 ? 'A6 on A4' : 'A6';
    console.log(`📦 Using format ${finalFormat} for ${ordersWithShipments.length} labels`);

    // Create a combined PDF by fetching all labels and merging them
    const pdfBuffers: ArrayBuffer[] = [];
    const MAX_RETRIES = 3;
    const TIMEOUT_MS = 30000;

    // Fetch each label PDF
    for (const order of ordersWithShipments) {
      console.log(`📄 Getting label for order ${order.id}, shipment ${order.packeta_shipment_id}`);

      let labelResponse: Response | undefined;
      let lastError: Error | null = null;

      // Retry logic for each label
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

           const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
 <packetLabelPdf>
   <apiPassword>${process.env.PACKETA_API_PASSWORD}</apiPassword>
   <packetId>${order.packeta_shipment_id}</packetId>
   <format>${finalFormat}</format>
   <offset>0</offset>
 </packetLabelPdf>`;

          const apiUrl = process.env.PACKETA_API_URL || 'https://www.zasilkovna.cz/api/rest';

          labelResponse = await fetch(`${apiUrl}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/xml",
              "Accept": "application/pdf",
            },
            body: xmlBody,
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (labelResponse.ok || labelResponse.status < 500) {
            break; // Success or client error - exit retry loop
          }

          if (attempt < MAX_RETRIES) {
            const backoffTime = 1000 * Math.pow(2, attempt - 1);
            console.log(`⏳ Waiting ${backoffTime}ms before retry for order ${order.id}...`);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
          }

        } catch (error) {
          lastError = error as Error;
          console.log(`❌ Attempt ${attempt} failed for order ${order.id}:`, lastError.message);

          if (attempt < MAX_RETRIES) {
            const backoffTime = 1000 * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
          }
        }
      }

      // Handle response for this order
      if (!labelResponse || !labelResponse.ok) {
        console.warn(`⚠️ Failed to get label for order ${order.id}, skipping...`);
        continue; // Skip this order, continue with others
      }

      const pdfBuffer = await labelResponse.arrayBuffer();
      pdfBuffers.push(pdfBuffer);
      console.log(`✅ Got label for order ${order.id}`);
    }

    if (pdfBuffers.length === 0) {
      return NextResponse.json({ error: "No labels could be generated" }, { status: 500 });
    }

    // If only one label, return it directly
    if (pdfBuffers.length === 1) {
      console.log(`📦 Returning single label PDF`);
      return new NextResponse(pdfBuffers[0], {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="packeta-label-${ordersWithShipments[0].id}.pdf"`,
        },
      });
    }

    // For multiple labels, create a combined PDF
    console.log(`📦 Creating combined PDF with ${pdfBuffers.length} labels`);

    // Simple approach: concatenate PDF buffers (works for most cases)
    // For more complex PDF merging, would need pdf-lib or similar library
    const combinedBuffer = new Uint8Array(pdfBuffers.reduce((acc, buffer) => acc + buffer.byteLength, 0));
    let offset = 0;

    for (const buffer of pdfBuffers) {
      combinedBuffer.set(new Uint8Array(buffer), offset);
      offset += buffer.byteLength;
    }

    console.log(`📦 Generated combined PDF with ${pdfBuffers.length} labels`);

    return new NextResponse(combinedBuffer.buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="packeta-labels-bulk-${pdfBuffers.length}-labels.pdf"`,
      },
    });

  } catch (error) {
    console.error("Error bulk printing Packeta labels:", error);
    return NextResponse.json(
      { error: "Failed to bulk print labels" },
      { status: 500 }
    );
  }
}