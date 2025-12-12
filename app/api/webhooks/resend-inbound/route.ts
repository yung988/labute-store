import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Resend inbound email webhook
// Dokumentace: https://resend.com/docs/dashboard/webhooks/event-types

interface InboundEmail {
  from: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string;
  headers: Record<string, string>;
  attachments?: Array<{
    content: string; // base64
    filename: string;
    contentType: string;
    size: number;
  }>;
}

interface ResendWebhookPayload {
  type: 'email.received';
  created_at: string;
  data: InboundEmail;
}

export async function POST(req: NextRequest) {
  try {
    const payload: ResendWebhookPayload = await req.json();

    // Verify webhook signature (optional but recommended)
    // const signature = req.headers.get('svix-signature');
    // TODO: Add signature verification for security

    if (payload.type !== 'email.received') {
      return NextResponse.json({ message: 'Not an inbound email event' }, { status: 200 });
    }

    const email = payload.data;
    console.log('📧 Received email:', {
      from: email.from,
      to: email.to,
      subject: email.subject,
    });

    // Parse email to extract order ID if present
    const orderIdMatch = email.subject.match(/#(\d+)/) || email.text?.match(/#(\d+)/);
    const orderId = orderIdMatch ? orderIdMatch[1] : null;

    // Detect email type based on recipient
    const recipient = email.to[0];
    const emailType = getEmailType(recipient);

    switch (emailType) {
      case 'support':
        await handleSupportEmail(email, orderId);
        break;
      case 'returns':
        await handleReturnRequest(email, orderId);
        break;
      case 'order-reply':
        await handleOrderReply(email, orderId);
        break;
      default:
        await handleGeneralInquiry(email);
    }

    return NextResponse.json({
      success: true,
      processed: emailType,
      orderId: orderId || null
    });

  } catch (error) {
    console.error('Error processing inbound email:', error);
    return NextResponse.json(
      { error: 'Failed to process email' },
      { status: 500 }
    );
  }
}

function getEmailType(recipient: string): string {
  if (recipient.includes('help@') || recipient.includes('support@')) {
    return 'support';
  }
  if (recipient.includes('returns@') || recipient.includes('reklamace@')) {
    return 'returns';
  }
  if (recipient.includes('orders@') || recipient.includes('objednavky@')) {
    return 'order-reply';
  }
  return 'general';
}

async function handleSupportEmail(email: InboundEmail, orderId: string | null) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Create support ticket in database
  const { data, error } = await supabase
    .from('support_tickets')
    .insert({
      customer_email: email.from,
      subject: email.subject,
      message: email.text || email.html,
      order_id: orderId,
      status: 'open',
      created_at: new Date().toISOString(),
      attachments: email.attachments?.map(a => ({
        filename: a.filename,
        size: a.size,
        contentType: a.contentType,
      })) || [],
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create support ticket:', error);
    return;
  }

  console.log('✅ Created support ticket:', data.id);

  // Send auto-reply to customer
  await sendAutoReply(email.from, data.ticket_number.toString(), email.subject);
}

async function handleReturnRequest(email: InboundEmail, orderId: string | null) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Create return request
  const { data, error } = await supabase
    .from('return_requests')
    .insert({
      customer_email: email.from,
      order_id: orderId,
      reason: email.text || email.html,
      status: 'pending',
      created_at: new Date().toISOString(),
      photos: email.attachments?.filter(a => a.contentType.startsWith('image/')) || [],
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create return request:', error);
    return;
  }

  console.log('📦 Created return request:', data.id);
}

async function handleOrderReply(email: InboundEmail, orderId: string | null) {
  if (!orderId) {
    // No order ID found, treat as general support
    await handleSupportEmail(email, null);
    return;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Add note to order
  const { error } = await supabase
    .from('order_notes')
    .insert({
      order_id: orderId,
      note: `Customer reply: ${email.text || email.html}`,
      created_by: email.from,
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Failed to add order note:', error);
  }
}

async function handleGeneralInquiry(email: InboundEmail) {
  // Forward to support
  await handleSupportEmail(email, null);
}

async function sendAutoReply(customerEmail: string, ticketId: string, subject: string) {
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { render } = await import('@react-email/render');
  const TicketAutoReply = (await import('@/emails/TicketAutoReply')).default;

  const emailHtml = await render(
    TicketAutoReply({
      ticketNumber: parseInt(ticketId),
      customerEmail,
      subject,
    })
  );

  await resend.emails.send({
    from: 'YEEZUZ2020 Support <help@support.yeezuz2020.cz>',
    to: customerEmail,
    subject: `Ticket #${ticketId} - Děkujeme za vaši zprávu`,
    html: emailHtml,
  });
}
