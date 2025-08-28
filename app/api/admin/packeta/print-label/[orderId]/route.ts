import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await context.params;
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') || 'A6';

  console.log(`🌐 Request details:`, {
    orderId,
    format,
    url: req.url,
    method: req.method,
    headers: Object.fromEntries(req.headers.entries())
  });

  // Check if Packeta API password is configured
  if (!process.env.PACKETA_API_PASSWORD) {
    console.error('❌ PACKETA_API_PASSWORD is not set!');
    return NextResponse.json(
      { error: 'Packeta API password is not configured. Please set PACKETA_API_PASSWORD environment variable.' },
      { status: 500 }
    );
  }

  console.log(`🔑 Packeta API password is configured (length: ${process.env.PACKETA_API_PASSWORD.length})`);

  try {
    console.log(`🏷️ Print label request for order: ${orderId}`);

    // Get order with Packeta shipment ID
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("packeta_shipment_id")
      .eq("id", orderId)
      .single();

    if (orderError || !order || !order.packeta_shipment_id) {
      console.error("❌ Print label error:", {
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

    console.log(`✅ Found order with shipment ID: ${order.packeta_shipment_id}`);

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

        // Validate and set format - only A6 formats are allowed since June 2023
        const allowedFormats = ['A6', 'A6 on A4'];
        const labelFormat = allowedFormats.includes(format) ? format : 'A6';
        
        console.log(`🏷️ Using label format: ${labelFormat}`);
        
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
    console.log(`📄 PDF buffer received, size: ${pdfBuffer.byteLength} bytes`);

    // Test if we can create a simple text file first
    const testFileName = `test-${orderId}.txt`;
    const testContent = `Test file for order ${orderId} at ${new Date().toISOString()}`;

    console.log(`🧪 Testing storage upload with text file: ${testFileName}`);

    const { data: testUploadData, error: testUploadError } = await supabaseAdmin.storage
      .from('packeta-labels')
      .upload(testFileName, testContent, {
        contentType: 'text/plain',
        upsert: true
      });

    console.log(`🧪 Test upload result:`, { data: testUploadData, error: testUploadError });

    if (testUploadError) {
      console.error('❌ Even test upload failed, storage is not working properly');
      // Continue with fallback
    } else {
      console.log('✅ Test upload successful, storage is working');
    }

    // Upload PDF to Supabase storage bucket
    const fileName = `packeta-label-${orderId}.pdf`;
    console.log(`📤 Uploading PDF to storage: ${fileName}`);
    console.log(`📊 PDF buffer size: ${pdfBuffer.byteLength} bytes`);

    // Try different upload approaches
    let uploadData, uploadError;

    try {
      const result = await supabaseAdmin.storage
        .from('packeta-labels')
        .upload(fileName, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true // Allow overwriting existing files
        });
      uploadData = result.data;
      uploadError = result.error;
    } catch (uploadErr) {
      console.error('❌ Upload threw exception:', uploadErr);
      uploadError = uploadErr;
    }

    console.log(`📤 Upload result:`, { data: uploadData, error: uploadError });

    // If upload failed, try to list bucket contents to see if we have access
    if (uploadError) {
      console.log('🔍 Checking bucket access...');
      try {
        const { data: listData, error: listError } = await supabaseAdmin.storage
          .from('packeta-labels')
          .list('', {
            limit: 10,
            sortBy: { column: 'name', order: 'asc' }
          });
        console.log('📁 Bucket list result:', { data: listData, error: listError });
      } catch (listErr) {
        console.error('❌ List bucket threw exception:', listErr);
      }
    }

    if (uploadError) {
      console.error('❌ Error uploading PDF to storage:', uploadError);
      // Fallback: return PDF directly if storage upload fails
      console.log('📄 Returning PDF directly due to storage error');
      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="packeta-label-${orderId}.pdf"`,
        },
      });
    }

    // Get public URL for the uploaded file
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('packeta-labels')
      .getPublicUrl(fileName);

    console.log(`🔗 Public URL data:`, publicUrlData);

    if (!publicUrlData.publicUrl) {
      console.error('❌ Error getting public URL for uploaded PDF');
      // Fallback: return PDF directly if URL generation fails
      console.log('📄 Returning PDF directly due to URL generation error');
      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="packeta-label-${orderId}.pdf"`,
        },
      });
    }

    console.log(`✅ Label saved to storage: ${publicUrlData.publicUrl}`);

    // Return the public URL instead of the PDF buffer
    console.log(`📤 Returning JSON response with URL: ${publicUrlData.publicUrl}`);

    const response = NextResponse.json({
      success: true,
      url: publicUrlData.publicUrl,
      fileName: fileName
    });

    // Add CORS headers to ensure proper response
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    console.log(`✅ Response headers:`, Object.fromEntries(response.headers.entries()));

    return response;

  } catch (error) {
    console.error("❌ Error getting Packeta label:", error);
    console.error("Stack trace:", error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: "Failed to get label", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}