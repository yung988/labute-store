import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Check if Telegram credentials are configured
    if (!TELEGRAM_BOT_TOKEN) {
      return new Response(
        JSON.stringify({
          error: 'TELEGRAM_BOT_TOKEN not configured',
          status: 'missing_token',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!TELEGRAM_CHAT_ID) {
      return new Response(
        JSON.stringify({
          error: 'TELEGRAM_CHAT_ID not configured',
          status: 'missing_chat_id',
          help: 'Send a message to your bot first, then call /getChatId to get your chat ID',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { action, message } = await req.json();

    // Get Chat ID from recent messages
    if (action === 'getChatId') {
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`);

      if (!response.ok) {
        return new Response(
          JSON.stringify({
            error: 'Failed to get updates from Telegram',
            status: response.status,
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      const data = await response.json();
      const updates = data.result;

      if (updates.length === 0) {
        return new Response(
          JSON.stringify({
            error: 'No messages found. Send a message to your bot first.',
            status: 'no_messages',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Get the most recent chat ID
      const latestMessage = updates[updates.length - 1];
      const chatId = latestMessage.message?.chat?.id;
      const username = latestMessage.message?.from?.username;
      const firstName = latestMessage.message?.from?.first_name;

      return new Response(
        JSON.stringify({
          chatId: chatId,
          username: username,
          firstName: firstName,
          message: 'Set this chatId as TELEGRAM_CHAT_ID environment variable',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Send test message
    const testMessage =
      message ||
      `🧪 <b>Test notifikace YEEZUZ2020 Store</b>

📅 Čas: ${new Date().toLocaleString('cs-CZ')}
🔧 Status: Telegram bot funguje správně!

🛒 Příklad notifikace:
• Nová objednávka #12345678
• Zákazník: Jan Novák
• Celkem: 1,299 Kč

✅ Systém je připraven!`;

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: testMessage,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({
          error: `Failed to send Telegram message: ${response.status}`,
          details: errorText,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const result = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test notification sent successfully!',
        telegramResponse: result,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in telegram-test function:', error);
    return new Response(
      JSON.stringify({
        error: `Function error: ${error.message}`,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
