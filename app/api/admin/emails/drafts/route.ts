import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAdminAuth } from '@/lib/middleware/admin-verification';

// GET - List drafts
export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit') || '50'), 100);

    const { data, error } = await supabaseAdmin
      .from('email_drafts')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ drafts: data || [] });
  } catch {
    return NextResponse.json({ error: 'Failed to load drafts' }, { status: 500 });
  }
});

// POST - Save draft
export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { to, subject, content, order_id } = body;

    if (!to || !subject) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('email_drafts')
      .insert({
        to_email: to,
        subject,
        content: content || '',
        order_id: order_id || null,
        metadata: { created_by: 'admin' },
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ draft: data });
  } catch (e) {
    console.error('Save draft error:', e);
    return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 });
  }
});
