import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { PDFDocument } from 'pdf-lib';

async function requireAuth() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      {
        error:
          'Packeta API password is not configured on Vercel. Please set PACKETA_API_PASSWORD environment variable.',
      },
      { status: 500 }
    );
  }

  let orderIds, format;

  // Handle both JSON and form data
  const contentType = req.headers.get('content-type');
  console.log(`📥 Request content-type: ${contentType}`);

  if (contentType?.includes('application/json')) {
    const body = await req.json();
    orderIds = body.orderIds;
    format = body.format;
    console.log(`📦 JSON request - orderIds: ${orderIds?.length}, format: ${format}`);
  } else {
    // Handle form data (from PacketaManagement.tsx)
    const formData = await req.formData();
    const payload = formData.get('payload');
    console.log(`📦 Form data - payload: ${payload}`);
    if (payload) {
      const parsedPayload = JSON.parse(payload as string);
      orderIds = parsedPayload.orderIds;
      format = parsedPayload.format;
      console.log(`📦 Parsed form data - orderIds: ${orderIds?.length}, format: ${format}`);
    }
  }

  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
    return NextResponse.json({ error: 'No order IDs provided' }, { status: 400 });
  }

  // Check if direct PDF return is requested
  const url = new URL(req.url);
  const isDirect = url.searchParams.get('direct') === 'true';
  console.log(`📄 Direct PDF mode: ${isDirect}`);

  try {
    // Get orders with Packeta shipment IDs
    const { data: orders, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, packeta_shipment_id')
      .in('id', orderIds);

    if (orderError || !orders) {
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    const ordersWithShipments = orders.filter((order) => order.packeta_shipment_id);

    if (ordersWithShipments.length === 0) {
      return NextResponse.json(
        { error: 'No orders with Packeta shipments found' },
        { status: 404 }
      );
    }

    console.log(`📦 Bulk printing ${ordersWithShipments.length} labels in format: ${format}`);

    // Use A6 on A4 format for bulk printing - Packeta will automatically arrange multiple labels per page
    const finalFormat = 'A6 on A4';
    console.log(`📦 Using format ${finalFormat} for ${ordersWithShipments.length} labels`);

    // Create batch XML request with all packetIds
    const packetIds = ordersWithShipments.map((order) => order.packeta_shipment_id);
    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<packetsLabelsPdf>
  <apiPassword>${process.env.PACKETA_API_PASSWORD}</apiPassword>
  <packetIds>
${packetIds.map((id) => `    <id>${id}</id>`).join('\n')}
  </packetIds>
  <format>${finalFormat}</format>
  <offset>0</offset>
</packetsLabelsPdf>`;

    console.log(`📡 Sending batch request to Packeta API with ${packetIds.length} packets:`, {
      packetIds,
      format: finalFormat,
    });

    // Single API call for all labels with retry logic
    const MAX_RETRIES = 3;
    const TIMEOUT_MS = 60000; // Increased timeout for batch requests
    const BASE_BACKOFF_MS = 1000;

    let labelResponse: Response | undefined;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`🔄 Packeta batch API attempt ${attempt}/${MAX_RETRIES}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const apiUrl = process.env.PACKETA_API_URL || 'https://www.zasilkovna.cz/api/rest';

        labelResponse = await fetch(`${apiUrl}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/xml',
            Accept: 'application/pdf',
          },
          body: xmlBody,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Check if response is successful (2xx) or client error (4xx) - don't retry these
        if (labelResponse.ok || labelResponse.status < 500) {
          break; // Success or client error - exit retry loop
        }

        // For server errors (5xx including 504), retry
        const errorText = await labelResponse.text();
        console.log(
          `⏳ Packeta batch API returned ${labelResponse.status}, will retry: ${errorText.substring(0, 100)}...`
        );

        if (attempt < MAX_RETRIES) {
          const backoffTime = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
          console.log(`⏳ Waiting ${backoffTime}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, backoffTime));
        }
      } catch (error) {
        const err = error as Error;
        lastError = err;
        console.log(`❌ Packeta batch API attempt ${attempt} failed:`, err.message);

        if (attempt < MAX_RETRIES) {
          const backoffTime = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
          console.log(`⏳ Network error, waiting ${backoffTime}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, backoffTime));
        }
      }
    }

    // Check if we got any response
    if (!labelResponse) {
      const errorMsg = lastError ? lastError.message : 'Unknown network error';
      console.error('❌ Packeta batch API failed after all retries:', errorMsg);
      return NextResponse.json(
        {
          error: `Packeta batch API is temporarily unavailable after ${MAX_RETRIES} attempts. Please try again in a few minutes.`,
        },
        { status: 503 }
      );
    }

    if (!labelResponse.ok) {
      const errorText = await labelResponse.text();
      console.error('Packeta batch API error:', {
        status: labelResponse.status,
        statusText: labelResponse.statusText,
        error: errorText,
        packetIds,
      });

      // Return user-friendly error messages
      if (labelResponse.status === 504) {
        return NextResponse.json(
          {
            error:
              'Packeta batch API is temporarily unavailable (gateway timeout). Please try again in a few minutes.',
          },
          { status: 503 }
        );
      } else if (labelResponse.status >= 500) {
        return NextResponse.json(
          {
            error:
              'Packeta batch API is experiencing server issues. Please try again in a few minutes.',
          },
          { status: 503 }
        );
      } else if (labelResponse.status === 404) {
        return NextResponse.json(
          {
            error:
              'One or more shipments not found. Please check if all shipments exist in Packeta system.',
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          error: `Failed to get batch labels from Packeta: ${labelResponse.status} ${labelResponse.statusText}`,
        },
        { status: 500 }
      );
    }

    // Parse response as PDF (binary) or as XML with base64-encoded PDF
    let finalPdfBuffer: ArrayBuffer;
    try {
      const contentType = labelResponse.headers.get('content-type') || '';
      if (
        contentType.includes('application/pdf') ||
        contentType.includes('application/octet-stream')
      ) {
        console.log('📄 Batch response content-type indicates PDF, reading as arrayBuffer');
        finalPdfBuffer = await labelResponse.arrayBuffer();
      } else {
        const responseText = await labelResponse.text();
        console.log(`📄 Packeta batch response received, size: ${responseText.length} bytes`);
        console.log(`📄 Response content-type: ${contentType}`);
        console.log(`📄 Response status: ${labelResponse.status}`);
        console.log(`📄 Response text preview: ${responseText.substring(0, 200)}...`);

        // Debug: Check if response is empty
        if (!responseText || responseText.trim() === '') {
          console.error('❌ Packeta batch API returned empty response');
          return NextResponse.json(
            { error: 'Packeta batch API returned empty response' },
            { status: 502 }
          );
        }

        // Check if response is XML with base64 PDF
        if (responseText.includes('<result>') && responseText.includes('</result>')) {
          console.log('📄 Batch response contains base64 PDF data');
          const resultMatch = responseText.match(/<result>([\s\S]*?)<\/result>/);
          const base64Data = resultMatch && resultMatch[1] ? resultMatch[1].trim() : '';
          if (!base64Data) {
            console.error('❌ No PDF data found in batch XML response');
            return NextResponse.json(
              {
                error: 'No PDF data found in Packeta batch response',
                details: responseText.substring(0, 500),
              },
              { status: 502 }
            );
          }

          // Decode base64 PDF safely (Node Buffer or browser atob)
          let bytesUint8: Uint8Array;
          if (typeof Buffer !== 'undefined') {
            const nodeBuf = Buffer.from(base64Data, 'base64');
            bytesUint8 = new Uint8Array(nodeBuf.buffer, nodeBuf.byteOffset, nodeBuf.byteLength);
          } else if (typeof atob !== 'undefined') {
            const binaryString = atob(base64Data);
            bytesUint8 = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++)
              bytesUint8[i] = binaryString.charCodeAt(i);
          } else {
            throw new Error('No base64 decoder available in this runtime');
          }
          finalPdfBuffer = (bytesUint8.buffer as ArrayBuffer).slice(
            bytesUint8.byteOffset,
            bytesUint8.byteOffset + bytesUint8.byteLength
          );
          console.log(`📄 Decoded batch PDF buffer size: ${finalPdfBuffer.byteLength} bytes`);
        } else {
          // XML but no <result> base64 payload. Check for Packeta fault and fallback.
          const isFault = responseText.includes('<status>fault');
          if (isFault) {
            console.warn('⚠️ Packeta batch returned fault. Falling back to per-label merge.');
            const origin = new URL(req.url).origin;
            const mergedPdf = await PDFDocument.create();

            for (const order of ordersWithShipments) {
              try {
                const singleUrl = `${origin}/api/admin/packeta/print-label/${order.id}?direct=true`;
                const res = await fetch(singleUrl);
                if (!res.ok) {
                  console.warn(`⚠️ Single label fetch failed for ${order.id}: ${res.status}`);
                  continue;
                }
                const ct = res.headers.get('content-type') || '';
                if (!ct.includes('application/pdf')) {
                  console.warn(`⚠️ Single label not PDF for ${order.id}, content-type: ${ct}`);
                  continue;
                }
                const bytes = new Uint8Array(await res.arrayBuffer());
                const srcPdf = await PDFDocument.load(bytes);
                const pages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
                pages.forEach((p) => mergedPdf.addPage(p));
              } catch (e) {
                console.warn(`⚠️ Error merging label for ${order.id}`, e);
              }
            }

            const mergedBytes = await mergedPdf.save();
            const fileName = `packeta-labels-merged-${ordersWithShipments.length}.pdf`;
            return new NextResponse(Buffer.from(mergedBytes), {
              headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${fileName}"`,
              },
            });
          }

          // Not a recognized success or fault response
          console.log('📄 Unexpected content-type or format for batch response');
          return NextResponse.json(
            {
              error: 'Packeta batch API returned unexpected response format',
              details: {
                contentType,
                status: labelResponse.status,
                responsePreview: responseText.substring(0, 500),
              },
            },
            { status: 502 }
          );
        }
      }
    } catch (parseError) {
      console.error('❌ Error parsing Packeta batch response:', parseError);
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      return NextResponse.json(
        { error: 'Error parsing Packeta batch response', details: errorMessage },
        { status: 502 }
      );
    }

    const fileName = `packeta-labels-bulk-${ordersWithShipments.length}-labels.pdf`;

    // If direct mode is requested, return PDF immediately without storing
    if (isDirect) {
      console.log('📄 Returning PDF directly (direct mode)');
      return new NextResponse(finalPdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${fileName}"`,
        },
      });
    }

    // Upload PDF to Supabase storage bucket
    console.log(`📤 Uploading bulk PDF to storage: ${fileName}`);

    const { error: uploadError } = await supabaseAdmin.storage
      .from('packeta-labels')
      .upload(fileName, finalPdfBuffer, {
        contentType: 'application/pdf',
        upsert: true, // Allow overwriting existing files
      });

    if (uploadError) {
      console.error('❌ Error uploading PDF to storage:', uploadError);
      // Fallback: return PDF directly if storage upload fails
      console.log('📄 Returning PDF directly due to storage error');
      return new NextResponse(finalPdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${fileName}"`,
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
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      });
    }

    console.log(`✅ Labels saved to storage: ${publicUrlData.publicUrl}`);

    // Update print tracking for all successfully printed orders
    try {
      const printedOrderIds = ordersWithShipments.map((o) => o.id);
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          label_printed_at: new Date().toISOString(),
          label_printed_count: 1,
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
      labelCount: ordersWithShipments.length,
    });
  } catch (error) {
    console.error('Error bulk printing Packeta labels:', error);
    return NextResponse.json({ error: 'Failed to bulk print labels' }, { status: 500 });
  }
}
