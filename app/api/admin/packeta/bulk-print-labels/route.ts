import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import JSZip from "jszip";

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

    // Validate and set format
    const allowedFormats = ['A6', 'A6 on A4'];
    const labelFormat = allowedFormats.includes(format) ? format : 'A6';

    // Create ZIP file for multiple PDFs
    const zip = new JSZip();
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
  <format>${labelFormat}</format>
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
      zip.file(`packeta-label-${order.id}.pdf`, pdfBuffer);
      console.log(`✅ Added label for order ${order.id} to ZIP`);
    }

    // Generate ZIP file
    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });
    
    console.log(`📦 Generated ZIP with ${Object.keys(zip.files).length} labels`);

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="packeta-labels-bulk-${labelFormat.replace(' ', '-')}.zip"`,
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