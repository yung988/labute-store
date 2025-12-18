import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-verification';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase/admin';

const resend = new Resend(process.env.RESEND_API_KEY);

type EmailAttachment = {
  filename: string;
  content: string; // base64 encoded
};

export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const to = String(body.to || '').trim();
    const subject = String(body.subject || '').trim();
    const html = String(body.html || '').trim();
    const email_type = String(body.email_type || 'support_reply');
    const order_id = body.order_id ? String(body.order_id) : null;
    const attachments: EmailAttachment[] = Array.isArray(body.attachments) ? body.attachments : [];

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing to/subject/html' }, { status: 400 });
    }

    // Prepare attachments for Resend (convert base64 to Buffer)
    const resendAttachments = attachments.map((att) => ({
      filename: att.filename,
      content: Buffer.from(att.content, 'base64'),
    }));

    const res = await resend.emails.send({
      from: 'noreply@yeezuz2020.cz',
      to,
      subject,
      html,
      ...(resendAttachments.length > 0 && { attachments: resendAttachments }),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const provider_id = (res as any)?.data?.id || null;

    const { error } = await supabaseAdmin.from('email_logs').insert({
      order_id,
      customer_email: to,
      email_type,
      subject,
      status: 'sent',
      provider: 'resend',
      provider_id,
      email_content: html,
      metadata: {
        trigger: 'admin-compose',
        attachments: attachments.map((a) => a.filename),
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, provider_id });
  } catch (e) {
    console.error('Compose email error:', e);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
});

