import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-verification';

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, orderId = 'TEST-001', customerName = 'Test Customer' } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const order = {
      id: orderId,
      customer_email: email,
      customer_name: customerName,
      customer_phone: '+420 123 456 789',
      packeta_point_id: null,
      status: 'paid',
    };

    const resp = await fetch(`${process.env.SITE_URL || ''}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'order-confirmation',
        to: email,
        data: {
          orderId: order.id,
          customerEmail: email,
          items: [
            { name: 'Test Tričko', qty: 1, price: '500 Kč' },
            { name: 'Test Mikina', qty: 1, price: '1,200 Kč' },
          ],
          total: '1,700 Kč',
        },
      }),
    });

    if (!resp.ok) {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: resp.status }
      );
    }

    const data = await resp.json();

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      data,
      testData: order,
    });
  } catch {
    return NextResponse.json({ error: 'Test email failed' }, { status: 500 });
  }
}

export const POST = withAdminAuth(handler);
