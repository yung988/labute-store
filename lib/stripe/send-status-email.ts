// Unified via /api/send-email using emails/* templates

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
    // Map to unified email types
    let type: 'shipping-confirmation' | 'delivered-confirmation' | 'status-update' = 'status-update';
    const data: Record<string, unknown> = {
      orderId: order.id,
      status: order.status,
      customerName: order.customer_name || undefined,
      customerEmail: order.customer_email,
      items,
    };

    if (order.status === 'shipped') {
      type = 'shipping-confirmation';
      // Additional shipping props can be fetched or passed if available (tracking URL etc.)
      data.trackingUrl = '';
    } else if (order.status === 'delivered') {
      type = 'delivered-confirmation';
      data.feedbackUrl = '';
    }

    await fetch(`${process.env.SITE_URL || ''}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.INTERNAL_API_SECRET ? { 'x-internal-secret': process.env.INTERNAL_API_SECRET } : {}),
      },
      body: JSON.stringify({ type, to: order.customer_email, data }),
    });

    console.log(`✅ Status email sent to ${order.customer_email} for status: ${order.status}`);
  } catch (error) {
    console.error('❌ Failed to send status email:', error);
    throw error;
  }
}
