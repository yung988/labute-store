import { NextRequest, NextResponse } from 'next/server';

// Slack notification function
async function sendSlackNotification(message: string, color: string = '#36a64f') {
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!slackWebhookUrl) {
    console.warn('Slack webhook URL not configured');
    return { success: false, error: 'Slack webhook URL not configured' };
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
      return { success: false, error: `Slack API error: ${response.statusText}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: `Network error: ${error}` };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { message, color } = await req.json();

    const testMessage = message || '🧪 Test zpráva z aplikace - Slack integrace funguje!';
    const testColor = color || '#36a64f';

    const result = await sendSlackNotification(testMessage, testColor);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test zpráva odeslána do Slacku',
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Neplatný JSON nebo chyba při zpracování',
      },
      { status: 400 }
    );
  }
}

// GET endpoint pro jednoduchý test
export async function GET() {
  const result = await sendSlackNotification(
    '🚀 Jednoduchý test Slack integrace z GET endpointu',
    '#ffa500'
  );

  if (result.success) {
    return NextResponse.json({
      success: true,
      message: 'Test zpráva odeslána do Slacku',
    });
  } else {
    return NextResponse.json(
      {
        success: false,
        error: result.error,
      },
      { status: 500 }
    );
  }
}
