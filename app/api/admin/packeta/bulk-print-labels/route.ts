import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { PDFDocument } from 'pdf-lib';

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

      // Parse XML response to get PDF data
      const responseText = await labelResponse.text();
      let pdfBuffer: ArrayBuffer;

      try {
        // Check if response is XML with base64 PDF
        if (responseText.includes('<result>') && responseText.includes('</result>')) {
          console.log(`📄 Response contains base64 PDF data for order ${order.id}`);
          const resultMatch = responseText.match(/<result>([^<]*)<\/result>/);
          if (!resultMatch || !resultMatch[1]) {
            console.error(`❌ No PDF data found in XML response for order ${order.id}`);
            continue;
          }

          // Decode base64 PDF
          const base64Data = resultMatch[1];
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          pdfBuffer = bytes.buffer;
        } else {
          // Fallback: treat as direct PDF
          console.log(`📄 Treating response as direct PDF for order ${order.id}`);
          pdfBuffer = new TextEncoder().encode(responseText).buffer;
        }
      } catch (parseError) {
        console.error(`❌ Error parsing Packeta response for order ${order.id}:`, parseError);
        continue;
      }

      pdfBuffers.push(pdfBuffer);
      console.log(`✅ Got label for order ${order.id}`);
    }

    if (pdfBuffers.length === 0) {
      return NextResponse.json({ error: "No labels could be generated" }, { status: 500 });
    }

    let finalPdfBuffer: ArrayBuffer;
    let fileName: string;

    // If only one label, use it directly
    if (pdfBuffers.length === 1) {
      console.log(`📦 Using single label PDF`);
      finalPdfBuffer = pdfBuffers[0];
      fileName = `packeta-label-${ordersWithShipments[0].id}.pdf`;
    } else {
      // For multiple labels, merge PDFs using pdf-lib
      console.log(`📦 Merging ${pdfBuffers.length} PDFs using pdf-lib`);

      try {
        const mergedPdf = await PDFDocument.create();

        for (let i = 0; i < pdfBuffers.length; i++) {
          const pdfBuffer = pdfBuffers[i];
          console.log(`📄 Processing PDF ${i + 1}/${pdfBuffers.length}`);
          
          try {
            const pdf = await PDFDocument.load(pdfBuffer);
            const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            
            pages.forEach((page) => {
              mergedPdf.addPage(page);
            });
            
            console.log(`✅ Added ${pages.length} pages from PDF ${i + 1}`);
          } catch (pdfError) {
            console.error(`❌ Error processing PDF ${i + 1}:`, pdfError);
            // Continue with other PDFs
          }
        }

        const mergedPdfBytes = await mergedPdf.save();
        finalPdfBuffer = new Uint8Array(mergedPdfBytes).buffer;
        fileName = `packeta-labels-bulk-${pdfBuffers.length}-labels.pdf`;
        
        console.log(`✅ Successfully merged ${pdfBuffers.length} PDFs into one document`);
      } catch (mergeError) {
        console.error(`❌ Error merging PDFs:`, mergeError);
        return NextResponse.json({ error: "Failed to merge PDF labels" }, { status: 500 });
      }
    }

    // Upload PDF to Supabase storage bucket
    console.log(`📤 Uploading bulk PDF to storage: ${fileName}`);

    const { error: uploadError } = await supabaseAdmin.storage
      .from('packeta-labels')
      .upload(fileName, finalPdfBuffer, {
        contentType: 'application/pdf',
        upsert: true // Allow overwriting existing files
      });

    if (uploadError) {
      console.error('❌ Error uploading PDF to storage:', uploadError);
      // Fallback: return PDF directly if storage upload fails
      console.log('📄 Returning PDF directly due to storage error');
      return new NextResponse(finalPdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      });
    }

    // Get public URL for the uploaded file
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('packeta-labels')
      .getPublicUrl(fileName);

    if (!publicUrlData.publicUrl) {
      console.error('❌ Error getting public URL for uploaded PDF');
      // Fallback: return PDF directly if URL generation fails
      console.log('📄 Returning PDF directly due to URL generation error');
      return new NextResponse(finalPdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      });
    }

    console.log(`✅ Labels saved to storage: ${publicUrlData.publicUrl}`);

    // Update print tracking for all successfully printed orders
    try {
      const printedOrderIds = ordersWithShipments.slice(0, pdfBuffers.length).map(o => o.id);
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          label_printed_at: new Date().toISOString(),
          label_printed_count: 1
        })
        .in('id', printedOrderIds);

      if (updateError) {
        console.warn(`⚠️ Failed to update bulk print tracking:`, updateError);
      } else {
        console.log(`✅ Updated print tracking for ${printedOrderIds.length} orders`);
      }
    } catch (trackingError) {
      console.warn(`⚠️ Error updating bulk print tracking:`, trackingError);
    }

    // Return the public URL instead of the PDF buffer
    return NextResponse.json({
      success: true,
      url: publicUrlData.publicUrl,
      fileName: fileName,
      labelCount: pdfBuffers.length
    });

  } catch (error) {
    console.error("Error bulk printing Packeta labels:", error);
    return NextResponse.json(
      { error: "Failed to bulk print labels" },
      { status: 500 }
    );
  }
}