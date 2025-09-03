import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAdminAuth } from '@/lib/middleware/admin-verification';

export const GET = withAdminAuth(async () => {
  try {
    const { data: shipments, error } = await supabaseAdmin
      .from('orders')
      .select('id, packeta_shipment_id, customer_name, customer_email, status, created_at')
      .not('packeta_shipment_id', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      shipments: shipments.map((order) => ({
        id: order.id,
        order_id: order.id,
        packeta_shipment_id: order.packeta_shipment_id,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        status: order.status,
        created_at: order.created_at,
      })),
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch shipments' }, { status: 500 });
  }
});
