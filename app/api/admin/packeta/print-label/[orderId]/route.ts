import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAdminAuthWithParams } from '@/lib/middleware/admin-verification';

async function handler(
  req: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await context.params;
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') || 'A6';
  const returnDirect = searchParams.get('direct') === 'true';

  if (!process.env.PACKETA_API_PASSWORD) {
    return NextResponse.json(
      { error: 'Packeta API password is not configured.' },
      { status: 500 }
    );
  }

  try {
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('packeta_shipment_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order || !order.packeta_shipment_id) {
      return NextResponse.json({ error: 'Order or Packeta shipment not found' }, { status: 404 });
    }

    if (!order.packeta_shipment_id || order.packeta_shipment_id.trim() === '') {
      return NextResponse.json({ error: 'Shipment ID is missing or empty' }, { status: 400 });
    }

    const MAX_RETRIES = 3;
    const TIMEOUT_MS = 30000;
    const BASE_BACKOFF_MS = 1000;

    let labelResponse: Response | undefined;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const formatMapping: Record<string, string> = {
          A6: 'A6 on A4',
          'A6 on A4': 'A6 on A4',
          A6_on_A4: 'A6 on A4',
          'A6 on A6': 'A6 on A6',
          'A7 on A4': 'A7 on A4',
          PDF: 'A6 on A4',
          ZPL: 'A6 on A4',
        };
        const labelFormat = formatMapping[format] || 'A6 on A4';

        const apiUrl = process.env.PACKETA_API_URL || 'https://www.zasilkovna.cz/api/rest';

        const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<packetLabelPdf>
  <apiPassword>${process.env.PACKETA_API_PASSWORD}</apiPassword>
  <packetId>${order.packeta_shipment_id}</packetId>
  <format>${labelFormat}</format>
  <offset>0</offset>
</packetLabelPdf>`;

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

        if (labelResponse.ok || labelResponse.status < 500) {
          break;
        }

        await labelResponse.text();

        if (attempt < MAX_RETRIES) {
          const backoffTime = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, backoffTime));
        }
      } catch (error) {
        lastError = error as Error;

        if (attempt < MAX_RETRIES) {
          const backoffTime = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, backoffTime));
        }
      }
    }

    if (!labelResponse) {
      const errorMsg = lastError ? lastError.message : 'Unknown network error';
      console.error('Packeta label API failed after all retries:', errorMsg);
      return NextResponse.json(
        { error: `Packeta label API is temporarily unavailable. Please try again.` },
        { status: 503 }
      );
    }

    if (!labelResponse.ok) {
      const errorText = await labelResponse.text();
      console.error('Packeta label API error:', labelResponse.status, errorText.substring(0, 200));

      if (labelResponse.status === 504 || labelResponse.status >= 500) {
        return NextResponse.json(
          { error: 'Packeta API is temporarily unavailable. Please try again.' },
          { status: 503 }
        );
      } else if (labelResponse.status === 404) {
        return NextResponse.json(
          { error: 'Shipment not found in Packeta system.' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: `Failed to get label from Packeta: ${labelResponse.status}` },
        { status: 500 }
      );
    }

    let pdfBuffer: ArrayBuffer;
    try {
      const contentType = labelResponse.headers.get('content-type') || '';
      if (
        contentType.includes('application/pdf') ||
        contentType.includes('application/octet-stream')
      ) {
        pdfBuffer = await labelResponse.arrayBuffer();
      } else {
        const responseText = await labelResponse.text();

        if (!responseText || responseText.trim() === '') {
          return NextResponse.json(
            { error: 'Packeta API returned empty response' },
            { status: 502 }
          );
        }

        if (responseText.includes('<result>') && responseText.includes('</result>')) {
          const resultMatch = responseText.match(/<result>([\s\S]*?)<\/result>/);
          const base64Data = resultMatch && resultMatch[1] ? resultMatch[1].trim() : '';
          if (!base64Data) {
            return NextResponse.json(
              { error: 'No PDF data found in Packeta response' },
              { status: 502 }
            );
          }

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
          pdfBuffer = new ArrayBuffer(bytesUint8.byteLength);
          new Uint8Array(pdfBuffer).set(bytesUint8);
        } else {
          pdfBuffer = new TextEncoder().encode(responseText).buffer;
        }
      }
    } catch (parseError) {
      console.error('Error parsing Packeta response:', parseError);
      return NextResponse.json(
        { error: 'Error parsing Packeta response' },
        { status: 502 }
      );
    }

    if (returnDirect) {
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="packeta-label-${orderId}.pdf"`,
        },
      });
    }

    const fileName = `packeta-label-${orderId}.pdf`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('packeta-labels')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="packeta-label-${orderId}.pdf"`,
        },
      });
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('packeta-labels')
      .getPublicUrl(fileName);

    if (!publicUrlData.publicUrl) {
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="packeta-label-${orderId}.pdf"`,
        },
      });
    }

    await supabaseAdmin
      .from('orders')
      .update({
        label_printed_at: new Date().toISOString(),
        label_printed_count: 1,
      })
      .eq('id', orderId);

    return NextResponse.json({
      success: true,
      url: publicUrlData.publicUrl,
      fileName: fileName,
    });
  } catch (error) {
    console.error('Error getting Packeta label:', error);
    return NextResponse.json(
      { error: 'Failed to get label' },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuthWithParams(handler);
