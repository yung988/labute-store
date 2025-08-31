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
      from: 'YEEZUZ2020 <noreply@yeezuz2020.store>',
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
      <td style="padding: 16px 0; border-bottom: 1px solid #000; font-size: 14px;">
        <div style="font-weight: 500;">${item.name || item.product_name || 'Produkt'}</div>
        ${item.size ? `<div style="color: #666; font-size: 12px; margin-top: 4px;">Velikost: ${item.size}</div>` : ''}
      </td>
      <td style="padding: 16px 0; border-bottom: 1px solid #000; text-align: center; font-size: 14px;">
        ${item.quantity || 1}
      </td>
      <td style="padding: 16px 0; border-bottom: 1px solid #000; text-align: right; font-size: 14px; font-weight: 500;">
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
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #000;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

        <!-- Header -->
        <div style="text-align: center; padding: 40px 20px; border-bottom: 1px solid #000;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 300; letter-spacing: 2px; color: #000;">YEEZUZ2020</h1>
        </div>

        <!-- Content -->
        <div style="padding: 40px 20px;">

          <h2 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 400; color: #000;">Děkujeme za vaši objednávku</h2>

          <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #000;">
            Ahoj ${order.customer_name || 'zákazníče'},
          </p>

          <p style="margin: 0 0 32px 0; font-size: 14px; line-height: 1.6; color: #000;">
            Vaše objednávka <strong>#${order.id.slice(-8)}</strong> byla úspěšně přijata a bude zpracována.
          </p>

          <!-- Order Details -->
          <div style="margin: 32px 0;">
            <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 400; color: #000;">Detaily objednávky</h3>

            <table style="width: 100%; border-collapse: collapse; margin: 0;">
              <thead>
                <tr>
                  <th style="padding: 16px 0; border-bottom: 2px solid #000; text-align: left; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Produkt</th>
                  <th style="padding: 16px 0; border-bottom: 2px solid #000; text-align: center; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Počet</th>
                  <th style="padding: 16px 0; border-bottom: 2px solid #000; text-align: right; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Cena</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
                <tr>
                  <td colspan="2" style="padding: 24px 0 16px 0; border-top: 2px solid #000; font-size: 16px; font-weight: 500;">Celkem</td>
                  <td style="padding: 24px 0 16px 0; border-top: 2px solid #000; text-align: right; font-size: 16px; font-weight: 500;">
                    ${formatPrice(order.amount_total)} Kč
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Order Info -->
          <div style="margin: 32px 0; padding: 20px; border: 1px solid #000;">
            <div style="margin: 0 0 8px 0; font-size: 14px;"><strong>Stav:</strong> ${getStatusText(order.status)}</div>
            <div style="margin: 0 0 8px 0; font-size: 14px;"><strong>Email:</strong> ${order.customer_email}</div>
            <div style="margin: 0; font-size: 14px;"><strong>Datum:</strong> ${new Date(order.created_at).toLocaleDateString('cs-CZ')}</div>
          </div>

          <p style="margin: 32px 0 0 0; font-size: 14px; line-height: 1.6; color: #000;">
            Jakmile bude vaše objednávka expedována, pošleme vám sledovací číslo.
          </p>

        </div>

        <!-- Footer -->
        <div style="padding: 40px 20px; border-top: 1px solid #000; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #666; line-height: 1.6;">
            YEEZUZ2020 Store<br>
            Pro jakékoliv dotazy: info@yeezuz2020.store
          </p>
        </div>

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
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #000;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

        <!-- Header -->
        <div style="text-align: center; padding: 40px 20px; border-bottom: 1px solid #000;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 300; letter-spacing: 2px; color: #000;">YEEZUZ2020</h1>
        </div>

        <!-- Content -->
        <div style="padding: 40px 20px;">

          <h2 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 400; color: #000;">Změna stavu objednávky</h2>

          <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #000;">
            Ahoj ${order.customer_name || 'zákazníče'},
          </p>

          <p style="margin: 0 0 32px 0; font-size: 14px; line-height: 1.6; color: #000;">
            Stav vaší objednávky <strong>#${order.id.slice(-8)}</strong> se změnil.
          </p>

          <!-- Status Change -->
          <div style="border: 1px solid #000; padding: 20px; margin: 32px 0;">
            <div style="margin: 0 0 12px 0; font-size: 14px;">
              <strong>Předchozí stav:</strong> ${statusMessages[oldStatus] || oldStatus}
            </div>
            <div style="margin: 0; font-size: 14px;">
              <strong>Nový stav:</strong> ${statusMessages[order.status] || order.status}
            </div>
          </div>

          ${order.packeta_tracking_url ? `
            <div style="border: 1px solid #000; padding: 20px; margin: 32px 0;">
              <div style="margin: 0 0 12px 0; font-size: 14px; font-weight: 500;">Sledování zásilky</div>
              <a href="${order.packeta_tracking_url}" style="color: #000; text-decoration: underline; font-size: 14px; word-break: break-all;">
                ${order.packeta_tracking_url}
              </a>
            </div>
          ` : ''}

        </div>

        <!-- Footer -->
        <div style="padding: 40px 20px; border-top: 1px solid #000; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #666; line-height: 1.6;">
            YEEZUZ2020 Store<br>
            Pro jakékoliv dotazy: info@yeezuz2020.store
          </p>
        </div>

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
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #000;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

        <!-- Header -->
        <div style="text-align: center; padding: 40px 20px; border-bottom: 1px solid #000;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 300; letter-spacing: 2px; color: #000;">YEEZUZ2020</h1>
        </div>

        <!-- Content -->
        <div style="padding: 40px 20px;">

          <h2 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 400; color: #000;">Vaše objednávka byla odeslána</h2>

          <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #000;">
            Ahoj ${order.customer_name || 'zákazníče'},
          </p>

          <p style="margin: 0 0 32px 0; font-size: 14px; line-height: 1.6; color: #000;">
            Skvělé zprávy! Vaše objednávka <strong>#${order.id.slice(-8)}</strong> byla odeslána a je na cestě k vám.
          </p>

          <!-- Tracking Section -->
          <div style="border: 1px solid #000; padding: 24px; margin: 32px 0; text-align: center;">
            <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 400; color: #000;">Sledování zásilky</h3>

            <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #000;">
              Vaši zásilku můžete sledovat pomocí odkazu níže:
            </p>

            <a href="${order.packeta_tracking_url}"
               style="display: inline-block; background-color: #000; color: #fff; padding: 12px 32px;
                      text-decoration: none; font-size: 14px; font-weight: 500;
                      letter-spacing: 1px; text-transform: uppercase;
                      transition: all 0.2s ease;">
              Sledovat zásilku
            </a>

            ${order.packeta_shipment_id ? `
              <p style="margin: 20px 0 0 0; font-size: 12px; color: #666;">
                Číslo zásilky: <strong>${order.packeta_shipment_id}</strong>
              </p>
            ` : ''}
          </div>

          <!-- Info Box -->
          <div style="border: 1px solid #000; padding: 20px; margin: 32px 0;">
            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #000;">
              <strong>Informace o doručení:</strong><br>
              Zásilka obvykle dorazí do 1-3 pracovních dnů. O příchodu na výdejní místo budete informováni SMS zprávou.
            </p>
          </div>

        </div>

        <!-- Footer -->
        <div style="padding: 40px 20px; border-top: 1px solid #000; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #666; line-height: 1.6;">
            YEEZUZ2020 Store<br>
            Pro jakékoliv dotazy: info@yeezuz2020.store
          </p>
        </div>

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
