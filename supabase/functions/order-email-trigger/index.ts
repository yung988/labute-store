import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
      oldStatus: oldRecord?.status
    });

    // Handle new orders (INSERT)
    if (payload.type === 'INSERT') {
      await sendOrderConfirmationEmail(record);
      return new Response('Order confirmation sent', { status: 200 });
    }

    // Handle status changes (UPDATE)
    if (payload.type === 'UPDATE') {
      // Check if status changed
      if (record.status !== oldRecord?.status) {
        await sendOrderStatusEmail(record, oldRecord.status);
        return new Response('Status update email sent', { status: 200 });
      }

      // Check if tracking info was added
      if (record.packeta_tracking_url && !oldRecord?.packeta_tracking_url) {
        await sendShippingEmail(record);
        return new Response('Shipping email sent', { status: 200 });
      }
    }

    return new Response('No email action needed', { status: 200 });

  } catch (error) {
    console.error('Error processing order email trigger:', error);
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
});

async function sendOrderConfirmationEmail(order: OrderRecord) {
  const emailHtml = generateOrderConfirmationEmail(order);

  await sendEmail({
    to: order.customer_email,
    subject: `Potvrzení objednávky #${order.id.slice(-8)}`,
    html: emailHtml
  });
}

async function sendOrderStatusEmail(order: OrderRecord, oldStatus: string) {
  const statusMessages = {
    'new': 'Nová objednávka',
    'paid': 'Zaplaceno',
    'processing': 'Zpracovává se',
    'shipped': 'Odesláno',
    'delivered': 'Doručeno',
    'cancelled': 'Zrušeno'
  };

  const emailHtml = generateStatusUpdateEmail(order, oldStatus, statusMessages);

  await sendEmail({
    to: order.customer_email,
    subject: `Změna stavu objednávky #${order.id.slice(-8)}`,
    html: emailHtml
  });
}

async function sendShippingEmail(order: OrderRecord) {
  const emailHtml = generateShippingEmail(order);

  await sendEmail({
    to: order.customer_email,
    subject: `Vaše objednávka byla odeslána #${order.id.slice(-8)}`,
    html: emailHtml
  });
}

async function sendEmail({ to, subject, html }: { to: string, subject: string, html: string }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'YEEZUZ2020 Store <noreply@yeezuz2020.store>',
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
  return result;
}

function generateOrderConfirmationEmail(order: OrderRecord): string {
  const items = Array.isArray(order.items) ? order.items : [];
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">
        ${item.name || item.product_name || 'Produkt'}
        ${item.size ? ` (velikost: ${item.size})` : ''}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
        ${item.quantity || 1}x
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
        ${formatPrice(item.price_cents || 0)} Kč
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Potvrzení objednávky</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #000; text-align: center;">YEEZUZ2020 STORE</h1>

        <h2>Děkujeme za vaši objednávku!</h2>

        <p>Ahoj ${order.customer_name || 'zákazníče'},</p>
        <p>Vaše objednávka #${order.id.slice(-8)} byla úspěšně přijata a bude zpracována.</p>

        <h3>Detaily objednávky:</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Produkt</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Množství</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Cena</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
            <tr style="font-weight: bold; background-color: #f9f9f9;">
              <td colspan="2" style="padding: 15px; border-top: 2px solid #ddd;">Celkem:</td>
              <td style="padding: 15px; text-align: right; border-top: 2px solid #ddd;">
                ${formatPrice(order.amount_total)} Kč
              </td>
            </tr>
          </tbody>
        </table>

        <div style="background-color: #f0f0f0; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p><strong>Stav objednávky:</strong> ${getStatusText(order.status)}</p>
          <p><strong>Email:</strong> ${order.customer_email}</p>
          <p><strong>Datum:</strong> ${new Date(order.created_at).toLocaleDateString('cs-CZ')}</p>
        </div>

        <p>Jakmile bude vaše objednávka expedována, pošleme vám sledovací číslo.</p>

        <hr style="margin: 30px 0;">
        <p style="text-align: center; color: #666; font-size: 14px;">
          YEEZUZ2020 Store<br>
          Pro jakékoliv dotazy nás kontaktujte na yeezuz332@gmail.com
        </p>
      </div>
    </body>
    </html>
  `;
}

function generateStatusUpdateEmail(order: OrderRecord, oldStatus: string, statusMessages: Record<string, string>): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Změna stavu objednávky</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #000; text-align: center;">YEEZUZ2020 STORE</h1>

        <h2>Změna stavu objednávky</h2>

        <p>Ahoj ${order.customer_name || 'zákazníče'},</p>
        <p>Stav vaší objednávky #${order.id.slice(-8)} se změnil.</p>

        <div style="background-color: #e8f4f8; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 5px solid #007cba;">
          <p style="margin: 0;"><strong>Předchozí stav:</strong> ${statusMessages[oldStatus] || oldStatus}</p>
          <p style="margin: 10px 0 0 0;"><strong>Nový stav:</strong> ${statusMessages[order.status] || order.status}</p>
        </div>

        ${order.packeta_tracking_url ? `
          <div style="background-color: #f0f8e8; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p><strong>Sledování zásilky:</strong></p>
            <a href="${order.packeta_tracking_url}" style="color: #007cba; text-decoration: none;">
              ${order.packeta_tracking_url}
            </a>
          </div>
        ` : ''}

        <hr style="margin: 30px 0;">
        <p style="text-align: center; color: #666; font-size: 14px;">
          YEEZUZ2020 Store<br>
          Pro jakékoliv dotazy nás kontaktujte na yeezuz332@gmail.com
        </p>
      </div>
    </body>
    </html>
  `;
}

function generateShippingEmail(order: OrderRecord): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Objednávka odeslána</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #000; text-align: center;">YEEZUZ2020 STORE</h1>

        <h2>📦 Vaše objednávka byla odeslána!</h2>

        <p>Ahoj ${order.customer_name || 'zákazníče'},</p>
        <p>Skvělé zprávy! Vaše objednávka #${order.id.slice(-8)} byla odeslána a je na cestě k vám.</p>

        <div style="background-color: #e8f5e8; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 5px solid #28a745;">
          <h3 style="margin-top: 0;">Sledování zásilky</h3>
          <p>Vaši zásilku můžete sledovat pomocí odkazu níže:</p>
          <a href="${order.packeta_tracking_url}"
             style="display: inline-block; background-color: #28a745; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 5px; font-weight: bold;">
            Sledovat zásilku
          </a>
          ${order.packeta_shipment_id ? `<p style="margin-top: 15px; font-size: 14px; color: #666;">
            Číslo zásilky: ${order.packeta_shipment_id}
          </p>` : ''}
        </div>

        <div style="background-color: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 5px; border: 1px solid #ffeaa7;">
          <p style="margin: 0;"><strong>💡 Tip:</strong> Zásilka obvykle dorazí do 1-3 pracovních dnů.
          O příchodu na výdejní místo budete informováni SMS zprávou.</p>
        </div>

        <hr style="margin: 30px 0;">
        <p style="text-align: center; color: #666; font-size: 14px;">
          YEEZUZ2020 Store<br>
          Pro jakékoliv dotazy nás kontaktujte na yeezuz332@gmail.com
        </p>
      </div>
    </body>
    </html>
  `;
}

function formatPrice(priceCents: number): string {
  return (priceCents / 100).toFixed(2).replace('.', ',');
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    'new': 'Nová',
    'paid': 'Zaplaceno',
    'processing': 'Zpracovává se',
    'shipped': 'Odesláno',
    'delivered': 'Doručeno',
    'cancelled': 'Zrušeno'
  };

  return statusMap[status] || status;
}
