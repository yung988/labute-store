import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAdminAuth } from '@/lib/middleware/admin-verification';

// GET /api/admin/returns - Seznam všech return requests
async function getHandler(req: NextRequest) {
  try {
    // Parse query params
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // pending, approved, rejected, received, refunded
    const orderId = searchParams.get('orderId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabaseAdmin
      .from('return_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Aplikuj filtry
    if (status) {
      query = query.eq('status', status);
    }
    if (orderId) {
      query = query.eq('order_id', orderId);
    }

    const { data: returns, error } = await query;

    if (error) {
      console.error('Error fetching returns:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Spočítej celkový počet
    const { count: totalCount } = await supabaseAdmin
      .from('return_requests')
      .select('*', { count: 'exact', head: true });

    // Pro každý return načti i info o objednávce
    const returnsWithOrders = await Promise.all(
      returns.map(async (returnReq) => {
        const { data: order } = await supabaseAdmin
          .from('orders')
          .select('id, customer_name, customer_email, total, status, created_at')
          .eq('id', returnReq.order_id)
          .single();

        return {
          ...returnReq,
          order
        };
      })
    );

    return NextResponse.json({
      returns: returnsWithOrders,
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (totalCount || 0)
      }
    });

  } catch (error) {
    console.error('Error in GET /api/admin/returns:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(getHandler);
