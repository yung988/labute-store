import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAdminAuth } from '@/lib/middleware/admin-verification';

// GET /api/admin/tickets - Seznam všech ticketů
async function getHandler(req: NextRequest) {
  try {

    // Parse query params pro filtrování
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // open, in_progress, resolved, closed
    const priority = searchParams.get('priority'); // low, normal, high, urgent
    const orderId = searchParams.get('orderId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabaseAdmin
      .from('support_tickets')
      .select(`
        *,
        replies:ticket_replies(
          id,
          sender_email,
          sender_type,
          message,
          created_at
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Aplikuj filtry
    if (status) {
      query = query.eq('status', status);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }
    if (orderId) {
      query = query.eq('order_id', orderId);
    }

    const { data: tickets, error } = await query;

    if (error) {
      console.error('Error fetching tickets:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Spočítej celkový počet pro pagination
    const { count: totalCount } = await supabaseAdmin
      .from('support_tickets')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      tickets,
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (totalCount || 0)
      }
    });

  } catch (error) {
    console.error('Error in GET /api/admin/tickets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(getHandler);

// POST /api/admin/tickets - Vytvoř nový ticket (manuálně z admin panelu)
async function postHandler(req: NextRequest) {
  try {

    const body = await req.json();
    const { customer_email, subject, message, order_id, priority = 'normal' } = body;

    if (!customer_email || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data: ticket, error } = await supabaseAdmin
      .from('support_tickets')
      .insert({
        customer_email,
        subject,
        message,
        order_id,
        priority,
        status: 'open',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating ticket:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ticket }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/admin/tickets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(postHandler);
