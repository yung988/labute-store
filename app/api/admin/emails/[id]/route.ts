import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAdminAuthWithParams } from '@/lib/middleware/admin-verification';

export const GET = withAdminAuthWithParams(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const { data, error } = await supabaseAdmin.from('email_logs').select('*').eq('id', id).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ email: data });
  } catch {
    return NextResponse.json({ error: 'Failed to load email' }, { status: 500 });
  }
});

