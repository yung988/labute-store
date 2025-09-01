import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(_req: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params;

  try {
    // Get order details (public info only)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, status, packeta_shipment_id, packeta_tracking_url, updated_at')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Map status to user-friendly text
    const statusTexts: Record<string, string> = {
      new: 'Nová objednávka',
      paid: 'Zaplaceno, připravuje se k odeslání',
      processing: 'Zpracovává se',
      shipped: 'Odesláno',
      delivered: 'Doručeno',
      cancelled: 'Zrušeno',
      returned: 'Vráceno',
    };

    const trackingInfo = {
      orderId: order.id,
      status: order.status,
      statusText: statusTexts[order.status] || order.status,
      lastUpdate: order.updated_at,
      packetaId: order.packeta_shipment_id,
      trackingUrl:
        order.packeta_tracking_url ||
        (order.packeta_shipment_id
          ? `https://tracking.packeta.com/cs/Z${order.packeta_shipment_id}`
          : undefined),
    };

    return NextResponse.json(trackingInfo);
  } catch (error) {
    console.error('Error getting tracking info:', error);
    return NextResponse.json({ error: 'Failed to get tracking info' }, { status: 500 });
  }
}
