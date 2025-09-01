import { Resend } from 'resend';
import OrderStatusEmail from '@/app/emails/OrderStatusEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

interface OrderData {
  id: string;
  customer_email: string | null;
  customer_name: string | null;
  status: string;
  items?: unknown[];
  packeta_shipment_id?: string | null;
}

export default async function sendOrderStatusEmail(order: OrderData, previousStatus?: string) {
  console.log(`📧 Attempting to send status email for order ${order.id}:`, {
    orderId: order.id,
    customerEmail: order.customer_email,
    newStatus: order.status,
    previousStatus,
    hasCustomerEmail: !!order.customer_email,
  });

  if (!order.customer_email) {
    console.log('❌ No customer email found, skipping status email');
    return;
  }

  // Don't send email if status hasn't actually changed
  if (previousStatus && previousStatus === order.status) {
    console.log('❌ Status unchanged, skipping email');
    return;
  }

  // Parse items if they exist
  const items = Array.isArray(order.items)
    ? order.items.map((item: unknown) => {
        const typedItem = item as {
          name?: string;
          quantity?: number;
          size?: string;
          color?: string;
        };
        return {
          name: typedItem.name,
          quantity: typedItem.quantity,
          size: typedItem.size,
          color: typedItem.color,
        };
      })
    : [];

  try {
    await resend.emails.send({
      from: 'noreply@yeezuz2020.store',
      to: order.customer_email,
      subject: `Změna stavu objednávky #${order.id.slice(-8)}`,
      react: OrderStatusEmail({
        customerName: order.customer_name || undefined,
        orderId: order.id,
        status: order.status,
        items: items,
        packetaId: order.packeta_shipment_id || undefined,
      }),
    });

    console.log(`✅ Status email sent to ${order.customer_email} for status: ${order.status}`);
  } catch (error) {
    console.error('❌ Failed to send status email:', error);
    throw error;
  }
}
