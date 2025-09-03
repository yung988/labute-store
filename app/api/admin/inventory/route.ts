import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAdminAuth } from '@/lib/middleware/admin-verification';


export const GET = withAdminAuth(async () => {
  try {
    const { data: products, error } = await supabaseAdmin.from('products').select(`
        id,
        name,
        slug,
        price_cents,
        skus (
          size,
          stock
        )
      `);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
});
