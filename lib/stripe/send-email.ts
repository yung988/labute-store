import { Resend } from 'resend';
import OrderReceiptEmail from '@/app/emails/OrderReceiptEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

interface Session {
  id: string;
  customer_details?: {
    email?: string | null;
    name?: string | null;
  } | null;
  amount_total: number | null;
  metadata?: {
    customer_first_name?: string;
    customer_last_name?: string;
    customer_phone?: string;
    delivery_method?: string;
    delivery_address?: string;
    delivery_city?: string;
    delivery_postal_code?: string;
    packeta_point_id?: string;
    packeta_point_name?: string;
    packeta_point_address?: string;
  };
  custom_fields?: Array<{
    key: string;
    text?: string | { value?: string };
  }>;
}

export default async function sendOrderEmail(session: Session, orderId: string) {
  if (!session.customer_details?.email) {
    throw new Error('Missing customer email');
  }

  // Načtení line items z Stripe
  const lineItemsRes = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${session.id}/line_items?expand[]=data.price.product`,
    {
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      },
    }
  );

  if (!lineItemsRes.ok) {
    throw new Error(`Failed to fetch line items: ${lineItemsRes.statusText}`);
  }

  const { data: items } = await lineItemsRes.json();

  // Filtrujeme shipping položky a normalizujeme data
  const normalizedItems = items
    .filter((item: any) => {
      const description = item.description || item.price?.product?.name || '';
      return (
        !description.toLowerCase().includes('zásilkovna') &&
        !description.toLowerCase().includes('doručení') &&
        !description.toLowerCase().includes('doprava')
      );
    })
    .map((item: any) => ({
      description: item.description || item.price?.product?.name || 'Produkt',
      quantity: item.quantity || 1,
      amount_total: item.amount_total || 0,
    }));

  const customerName =
    session.metadata?.customer_first_name && session.metadata?.customer_last_name
      ? `${session.metadata.customer_first_name} ${session.metadata.customer_last_name}`
      : session.customer_details?.name;

  // Pošleme email s novým template
  await resend.emails.send({
    from: 'YEEZUZ2020 <noreply@yeezuz2020.store>',
    to: session.customer_details.email,
    subject: `Potvrzení objednávky ${orderId} - YEEZUZ2020`,
    react: OrderReceiptEmail({
      session,
      items: normalizedItems,
      orderId,
    }),
  });

  const maskEmail = (e?: string | null) => {
    if (!e) return '[hidden]';
    const [user, domain] = e.split('@');
    if (!domain) return '[hidden]';
    const maskedUser = user.length <= 2 ? '**' : user[0] + '***' + user[user.length - 1];
    return `${maskedUser}@${domain}`;
  };

  console.log(
    '✅ Order confirmation email sent:',
    `Order ${orderId} to ${maskEmail(session.customer_details.email)}`
  );
}
