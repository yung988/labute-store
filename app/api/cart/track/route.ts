import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      sessionId, 
      items, 
      customerEmail, 
      customerName, 
      totalAmount 
    } = body;

    if (!sessionId || !items || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createClient();

    // Upsert abandoned cart (update if exists, insert if not)
    const { data, error } = await supabase
      .from('abandoned_carts')
      .upsert({
        session_id: sessionId,
        customer_email: customerEmail,
        customer_name: customerName,
        cart_items: items,
        total_amount: totalAmount,
        updated_at: new Date().toISOString(),
        // Reset abandoned_at when cart is updated
        abandoned_at: null,
        email_sent_at: null
      }, {
        onConflict: 'session_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error tracking cart:', error);
      return NextResponse.json({ error: 'Failed to track cart' }, { status: 500 });
    }

    return NextResponse.json({ success: true, cartId: data.id });
  } catch (error) {
    console.error('Cart tracking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const supabase = await createClient();

    // Mark cart as recovered (customer completed order)
    const { error } = await supabase
      .from('abandoned_carts')
      .update({
        recovered_at: new Date().toISOString(),
        abandoned_at: null
      })
      .eq('session_id', sessionId);

    if (error) {
      console.error('Error marking cart as recovered:', error);
      return NextResponse.json({ error: 'Failed to update cart' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cart recovery error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}