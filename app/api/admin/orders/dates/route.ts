import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Check if user is authenticated and is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get unique dates with orders from the last 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('created_at')
      .gte('created_at', threeMonthsAgo.toISOString())
      .order('created_at', { ascending: false });

    if (ordersError) {
      throw new Error(ordersError.message);
    }

    // Extract unique dates (just the date part, not time)
    const uniqueDates = new Set<string>();
    orders?.forEach((order) => {
      const date = new Date(order.created_at);
      const dateStr = date.toISOString().split('T')[0]; // Get YYYY-MM-DD format
      uniqueDates.add(dateStr);
    });

    return NextResponse.json({
      dates: Array.from(uniqueDates),
      count: uniqueDates.size,
    });
  } catch (error) {
    console.error('Error fetching order dates:', error);
    return NextResponse.json({ error: 'Failed to fetch order dates' }, { status: 500 });
  }
}
