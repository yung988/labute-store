import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAdminAuth } from '@/lib/middleware/admin-verification';

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.toLowerCase();
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const limit = Math.min(Number(searchParams.get('limit') || '100'), 200);

    let query = supabaseAdmin.from('email_logs').select('*').order('created_at', { ascending: false }).limit(limit);

    if (q) {
      // basic filters on email/subject/order_id
      // Note: Supabase TypeScript types can be too strict here; assert unknown then cast to the expected query type.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = (query as unknown as any).or(
        `customer_email.ilike.%${q}%,subject.ilike.%${q}%,order_id.ilike.%${q}%`
      );
    }

    if (type && type !== 'all') {
      query = query.eq('email_type', type);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ emails: data || [] });
  } catch {
    return NextResponse.json({ error: 'Failed to load emails' }, { status: 500 });
  }
});

