import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAdminAuthWithParams } from '@/lib/middleware/admin-verification';

// GET /api/admin/tickets/[id] - Detail ticketu včetně všech odpovědí
async function getHandler(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Fetch ticket s odpověďmi
    const { data: ticket, error } = await supabaseAdmin
      .from('support_tickets')
      .select(`
        *,
        replies:ticket_replies(
          id,
          sender_email,
          sender_type,
          message,
          is_internal_note,
          attachments,
          created_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      }
      console.error('Error fetching ticket:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Pokud má ticket order_id, načti i info o objednávce
    let orderInfo = null;
    if (ticket.order_id) {
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('id, customer_name, customer_email, total, status, created_at')
        .eq('id', ticket.order_id)
        .single();

      orderInfo = order;
    }

    return NextResponse.json({
      ticket: {
        ...ticket,
        replies: ticket.replies?.sort((a: { created_at: string }, b: { created_at: string }) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      },
      order: orderInfo
    });

  } catch (error) {
    console.error('Error in GET /api/admin/tickets/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuthWithParams(getHandler);

// PATCH /api/admin/tickets/[id] - Update ticketu (status, priorita, assigned_to)
async function patchHandler(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    // Povolené fieldy pro update
    if (body.status) updates.status = body.status;
    if (body.priority) updates.priority = body.priority;
    if (body.assigned_to !== undefined) updates.assigned_to = body.assigned_to;

    // Pokud se mění na resolved/closed, nastav resolved_at
    if (body.status === 'resolved' || body.status === 'closed') {
      updates.resolved_at = new Date().toISOString();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const { data: ticket, error } = await supabaseAdmin
      .from('support_tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating ticket:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ticket });

  } catch (error) {
    console.error('Error in PATCH /api/admin/tickets/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const PATCH = withAdminAuthWithParams(patchHandler);

// DELETE /api/admin/tickets/[id] - Smaž ticket (soft delete - změň status na 'closed')
async function deleteHandler(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Soft delete - jen změň status na closed
    const { error } = await supabaseAdmin
      .from('support_tickets')
      .update({ status: 'closed', resolved_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error deleting ticket:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in DELETE /api/admin/tickets/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const DELETE = withAdminAuthWithParams(deleteHandler);
