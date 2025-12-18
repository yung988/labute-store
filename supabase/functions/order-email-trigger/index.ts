import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: any;
  old_record?: any;
  schema: string;
}

interface OrderRecord {
  id: string;
  customer_email: string;
  customer_name: string;
  status: string;
  items: any[];
  packeta_shipment_id?: string;
  packeta_tracking_url?: string;
  amount_total: number;
  created_at: string;
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
const SITE_URL = Deno.env.get('SITE_URL') || 'https://yeezuz2020.cz';

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return new Response('Email service not configured', { status: 500 });
    }

    const payload: WebhookPayload = await req.json();

    // Only process orders table changes
    if (payload.table !== 'orders') {
      return new Response('Not an order change', { status: 200 });
    }

    const record = payload.record as OrderRecord;
    const oldRecord = payload.old_record as OrderRecord;

    console.log('Processing order change:', {
      type: payload.type,
      orderId: record.id,
      status: record.status,
      oldStatus: oldRecord?.status,
    });

    // Handle new orders (INSERT)
    if (payload.type === 'INSERT') {
      await callUnifiedEmailAPI('order-confirmation', record.customer_email, {
        orderId: record.id,
        customerEmail: record.customer_email,
        items: Array.isArray(record.items)
          ? record.items.map((it: any) => ({ name: it.name || 'Položka', qty: it.quantity || 1, price: it.price || '' }))
          : [],
        total: formatPrice(record.amount_total) + ' Kč',
      });
      await sendTelegramNotification(
        `🛒 Nová objednávka!\n\nID: #${record.id.slice(-8)}\nZákazník: ${record.customer_name || 'Neznámý'}\nEmail: ${record.customer_email}\nCelkem: ${formatPrice(record.amount_total)} Kč\n\n✉️ Potvrzovací email odeslán.`
      );
      return new Response('Order confirmation sent', { status: 200 });
    }

    // Handle status changes (UPDATE)
    if (payload.type === 'UPDATE') {
      // Check if status changed
      if (record.status !== oldRecord?.status) {
        await sendOrderStatusEmail(record, oldRecord.status);
        await sendTelegramNotification(
          `📋 Změna stavu objednávky\n\nID: #${record.id.slice(-8)}\nZákazník: ${record.customer_name || 'Neznámý'}\n\nStav: ${getStatusText(oldRecord.status)} → ${getStatusText(record.status)}\n\n✉️ Notifikační email odeslán.`
        );
        return new Response('Status update email sent', { status: 200 });
      }

      // Check if tracking info was added
      if (record.packeta_tracking_url && !oldRecord?.packeta_tracking_url) {
        await callUnifiedEmailAPI('shipping-confirmation', record.customer_email, {
          orderId: record.id,
          trackingUrl: record.packeta_tracking_url,
          trackingNumber: record.packeta_shipment_id || undefined,
          customerName: record.customer_name || undefined,
          customerEmail: record.customer_email,
          carrierName: 'Packeta',
        });
        await sendTelegramNotification(
          `📦 Objednávka odeslána!\n\nID: #${record.id.slice(-8)}\nZákazník: ${record.customer_name || 'Neznámý'}\n\n🚚 Sledování: ${record.packeta_tracking_url}\n${record.packeta_shipment_id ? `📋 Číslo zásilky: ${record.packeta_shipment_id}\n` : ''}\n✉️ Tracking email odeslán.`
        );
        return new Response('Shipping email sent', { status: 200 });
      }
    }

    return new Response('No email action needed', { status: 200 });
  } catch (error) {
    console.error('Error processing order email trigger:', error);
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
});

async function callUnifiedEmailAPI(type: string, to: string, data: Record<string, unknown>) {
  const response = await fetch(`${SITE_URL}/api/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type, to, data }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to call unified email API: ${response.status} ${errorText}`);
  }

  return response.json();
}

async function sendOrderStatusEmail(order: OrderRecord, _oldStatus: string) {
  await callUnifiedEmailAPI('status-update', order.customer_email, {
    orderId: order.id,
    status: order.status,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    items: order.items,
  });
}

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'YEEZUZ2020 <info@yeezuz2020.cz>',
      to: [to],
      subject: subject,
      html: html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send email: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  console.log('Email sent successfully:', result);
  return result as { id?: string };
}

async function logEmail(entry: {
  order_id: string;
  customer_email: string;
  email_type: string;
  subject: string;
  status: string;
  provider: string;
  provider_id: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } },
    auth: { persistSession: false },
  });

  const { error } = await supabase.from('email_logs').insert(entry);
  if (error) {
    console.error('Failed to log email:', error);
  }
}

async function sendTelegramNotification(message: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('Telegram credentials not configured, skipping notification');
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to send Telegram notification: ${response.status} ${errorText}`);
      return;
    }

    const result = await response.json();
    console.log('Telegram notification sent successfully:', result);
    return result;
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
  }
}

function formatPrice(priceCents: number): string {
  return (priceCents / 100).toFixed(2).replace('.', ',');
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    new: 'Nová',
    paid: 'Zaplaceno',
    processing: 'Zpracovává se',
    shipped: 'Odesláno',
    delivered: 'Doručeno',
    cancelled: 'Zrušeno',
  };

  return statusMap[status] || status;
}
