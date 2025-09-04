import { NextRequest, NextResponse } from 'next/server';

// Slack notification function (same as in resend webhook)
async function sendSlackNotification(message: string, color: string = '#36a64f') {
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!slackWebhookUrl) {
    console.warn('Slack webhook URL not configured');
    return;
  }

  try {
    const payload = {
      attachments: [
        {
          color,
          text: message,
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    const response = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Failed to send Slack notification:', response.statusText);
    }
  } catch (error) {
    console.error('Error sending Slack notification:', error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Handle different webhook providers (SendGrid, Postmark, etc.)
    const from = body.from || body.sender || body.email;
    const to = body.to || body.recipient;
    const subject = body.subject;
    const text = body.text || body.body || body.content;

    if (!from || !subject) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create Slack message
    const slackMessage =
      `📨 Nový e-mail od: ${from}\n` +
      `📧 Předmět: ${subject}\n` +
      `👤 Komu: ${to || 'N/A'}\n` +
      `📝 Text: ${text ? text.substring(0, 200) + (text.length > 200 ? '...' : '') : 'N/A'}`;

    // Send to Slack
    sendSlackNotification(slackMessage, '#007bff'); // blue for new emails

    // You can also save to database here if needed
    // const { error } = await supabaseAdmin
    //   .from('inbound_emails')
    //   .insert({
    //     from_email: from,
    //     to_email: to,
    //     subject,
    //     content: text,
    //     received_at: new Date().toISOString()
    //   });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Inbound email processing failed:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
