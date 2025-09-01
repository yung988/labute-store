import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get order communications (emails sent, status changes, etc.)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 404 });
    }

    // Build communication timeline from order data
    const communications = [];

    // Order created
    communications.push({
      id: `created-${order.id}`,
      timestamp: order.created_at,
      type: 'order_created',
      title: 'Objednávka vytvořena',
      description: `Objednávka byla vytvořena zákazníkem ${order.customer_email}`,
      icon: 'shopping-cart',
      automated: true,
    });

    // Status changes (we can infer some from current status)
    if (order.status === 'paid') {
      communications.push({
        id: `paid-${order.id}`,
        timestamp: order.updated_at,
        type: 'payment_received',
        title: 'Platba přijata',
        description: 'Platba byla úspěšně zpracována přes Stripe',
        icon: 'check-circle',
        automated: true,
      });
    }

    // Packeta shipment created
    if (order.packeta_shipment_id) {
      communications.push({
        id: `shipment-${order.id}`,
        timestamp: order.updated_at,
        type: 'shipment_created',
        title: 'Zásilka vytvořena',
        description: `Packeta zásilka ID: ${order.packeta_shipment_id}`,
        icon: 'truck',
        automated: true,
      });
    }

    // If shipped
    if (order.status === 'shipped') {
      communications.push({
        id: `shipped-${order.id}`,
        timestamp: order.updated_at,
        type: 'order_shipped',
        title: 'Objednávka odeslána',
        description: order.packeta_tracking_url
          ? `Zásilka odeslána. Tracking: ${order.packeta_tracking_url}`
          : 'Zásilka byla odeslána',
        icon: 'package',
        automated: true,
      });
    }

    // Sort by timestamp
    communications.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return NextResponse.json({ communications });
  } catch (error) {
    console.error('Error loading communications:', error);
    return NextResponse.json({ error: 'Failed to load communications' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { type, title, description } = body;

    // For now, we'll just return success
    // In the future, you could store communications in a separate table
    const communication = {
      id: `manual-${id}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      title,
      description,
      icon: 'message-circle',
      automated: false,
    };

    return NextResponse.json({ communication });
  } catch (error) {
    console.error('Error adding communication:', error);
    return NextResponse.json({ error: 'Failed to add communication' }, { status: 500 });
  }
}
