import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAdminAuth } from '@/lib/middleware/admin-verification';

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.toLowerCase();
    const limit = Math.min(Number(searchParams.get('limit') || '100'), 200);

    let query = supabaseAdmin
      .from('email_logs')
      .select('*')
      .in('status', ['sent', 'delivered', 'opened'])
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (q) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = (query as unknown as any).or(
        `customer_email.ilike.%${q}%,subject.ilike.%${q}%,order_id.ilike.%${q}%`
      );
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ emails: data || [] });
  } catch {
    return NextResponse.json({ error: 'Failed to load sent emails' }, { status: 500 });
  }
});
