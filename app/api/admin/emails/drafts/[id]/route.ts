import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAdminAuthWithParams } from '@/lib/middleware/admin-verification';

// GET - Get specific draft
async function getHandler(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { data, error } = await supabaseAdmin
      .from('email_drafts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ draft: data });
  } catch {
    return NextResponse.json({ error: 'Failed to load draft' }, { status: 500 });
  }
}

// PUT - Update draft
async function putHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { to, subject, content, order_id } = body;

    const { data, error } = await supabaseAdmin
      .from('email_drafts')
      .update({
        to_email: to,
        subject,
        content: content || '',
        order_id: order_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ draft: data });
  } catch (e) {
    console.error('Update draft error:', e);
    return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 });
  }
}

// DELETE - Delete draft
async function deleteHandler(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error } = await supabaseAdmin.from('email_drafts').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Delete draft error:', e);
    return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 });
  }
}

export const GET = withAdminAuthWithParams(getHandler);
export const PUT = withAdminAuthWithParams(putHandler);
export const DELETE = withAdminAuthWithParams(deleteHandler);
