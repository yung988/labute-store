import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const supabase = await createClient();

    // Mark cart as abandoned
    const { error } = await supabase
      .from('abandoned_carts')
      .update({
        abandoned_at: new Date().toISOString()
      })
      .eq('session_id', sessionId)
      .is('recovered_at', null); // Only mark as abandoned if not already recovered

    if (error) {
      console.error('Error marking cart as abandoned:', error);
      return NextResponse.json({ error: 'Failed to mark cart as abandoned' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cart abandon error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}