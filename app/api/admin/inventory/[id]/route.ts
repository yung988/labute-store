import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAdminAuth } from '@/lib/middleware/admin-verification';

export const PATCH = withAdminAuth(async (req: NextRequest) => {
  const url = new URL(req.url);
  const id = url.pathname.split('/').pop();
  const body = await req.json();
  const { size, stock } = body;

  if (!id) {
    return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
  }

  try {
    // Update stock for specific size of product
    const { data, error } = await supabaseAdmin
      .from('skus')
      .update({ stock })
      .eq('product_id', id)
      .eq('size', size)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sku: data });
  } catch {
    return NextResponse.json({ error: 'Failed to update stock' }, { status: 500 });
  }
});
