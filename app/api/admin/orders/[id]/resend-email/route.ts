import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import sendOrderStatusEmail from '@/lib/stripe/send-status-email';
import { Resend } from 'resend';
import OrderReceiptEmail from '@/app/emails/OrderReceiptEmail';
import { withAdminAuth } from '@/lib/middleware/admin-verification';

const resend = new Resend(process.env.RESEND_API_KEY);

export const POST = withAdminAuth(async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  const body = await req.json();
  const { type } = body as { type: 'receipt' | 'status' };

  try {
    // Get order data
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (!order.customer_email) {
      return NextResponse.json({ error: 'No customer email found' }, { status: 400 });
    }

    // Parse items from JSON string if needed
    let items: unknown[] = [];
    try {
      if (typeof order.items === 'string') {
        items = JSON.parse(order.items);
      } else if (Array.isArray(order.items)) {
        items = order.items;
      }
    } catch (e) {
      console.error('Failed to parse items for resend email:', e);
      items = [];
    }

    let providerId: string | null = null;

    if (type === 'receipt') {
      // Resend order confirmation email
      const res = await resend.emails.send({
        from: 'noreply@yeezuz2020.store',
        to: order.customer_email,
        subject: `Potvrzení objednávky #${order.id.slice(-8)}`,
        react: OrderReceiptEmail({
          session: {
            id: order.id,
            customer_details: { email: order.customer_email },
            amount_total: order.amount_total,
          },
          items: items.map((item: unknown) => {
            const typedItem = item as { description?: string; quantity?: number; amount_total?: number };
            return {
              description: typedItem.description || 'Unknown item',
              quantity: typedItem.quantity || 1,
              amount_total: typedItem.amount_total || 0,
            };
          }),
        }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      providerId = (res as any)?.data?.id || null;

      // Log email
      await supabaseAdmin.from('email_logs').insert({
        order_id: order.id,
        customer_email: order.customer_email,
        email_type: 'order_confirmation',
        subject: `Potvrzení objednávky #${order.id.slice(-8)}`,
        status: 'sent',
        provider: 'resend',
        provider_id: providerId,
        metadata: { trigger: 'admin-resend' },
      });
    } else if (type === 'status') {
      // Resend status email
      await sendOrderStatusEmail({
        id: order.id,
        customer_email: order.customer_email,
        customer_name: order.customer_name,
        status: order.status,
        items: items,
        packeta_shipment_id: order.packeta_shipment_id,
      });

      await supabaseAdmin.from('email_logs').insert({
        order_id: order.id,
        customer_email: order.customer_email,
        email_type: 'status',
        subject: `Změna stavu objednávky #${order.id.slice(-8)}`,
        status: 'sent',
        provider: 'resend',
        provider_id: providerId,
        metadata: { trigger: 'admin-resend' },
      });
    } else {
      return NextResponse.json(
        { error: "Invalid email type. Use 'receipt' or 'status'" },
        { status: 400 }
      );
    }

    const maskEmail = (e?: string | null) => {
      if (!e) return '[hidden]';
      const [user, domain] = e.split('@');
      if (!domain) return '[hidden]';
      const maskedUser = user.length <= 2 ? '**' : user[0] + '***' + user[user.length - 1];
      return `${maskedUser}@${domain}`;
    };
    console.log(`✅ Resent ${type} email to ${maskEmail(order.customer_email)} for order ${id}`);

    return NextResponse.json({
      success: true,
      message: `${type} email sent successfully`,
    });
  } catch (error) {
    console.error('Error resending email:', error);
    return NextResponse.json({ error: 'Failed to resend email' }, { status: 500 });
  }
});
