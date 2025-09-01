import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text?: string;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    message?: {
      message_id: number;
      chat: {
        id: number;
      };
    };
    data?: string;
  };
}

interface TelegramSettings {
  bot_token: string;
  allowed_chat_ids: string[];
  notifications_enabled: boolean;
  rate_limit_per_minute: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
  replyMarkup?: any
) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Telegram API error: ${error}`);
  }

  return response.json();
}

async function editTelegramMessage(
  botToken: string,
  chatId: string,
  messageId: number,
  text: string,
  replyMarkup?: any
) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Edit message error:', error);
    return null;
  }

  return response.json();
}

async function answerCallbackQuery(botToken: string, callbackQueryId: string, text?: string) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: false,
    }),
  });

  return response.ok;
}

async function getOrderById(supabase: any, orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(
      `
      *,
      order_items (
        id,
        quantity,
        price_cents,
        products (
          name,
          size
        )
      )
    `
    )
    .eq('id', orderId)
    .single();

  if (error) {
    console.error('Error fetching order:', error);
    return null;
  }

  return data;
}

async function getRecentOrders(supabase: any, limit: number = 10) {
  const { data, error } = await supabase
    .from('orders')
    .select(
      `
      id,
      customer_name,
      customer_email,
      amount_total,
      status,
      created_at,
      order_items (
        quantity,
        price_cents,
        products (
          name,
          size
        )
      )
    `
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching orders:', error);
    return [];
  }

  return data || [];
}

async function updateOrderStatus(supabase: any, orderId: string, newStatus: string) {
  const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);

  if (error) {
    console.error('Error updating order status:', error);
    return false;
  }

  return true;
}

function formatOrder(order: any): string {
  const items = order.order_items
    .map(
      (item: any) =>
        `• ${item.products.name}${item.products.size ? ` (${item.products.size})` : ''} - ${item.quantity}ks`
    )
    .join('\n');

  return `📦 <b>Objednávka #${order.id}</b>

👤 <b>Zákazník:</b> ${order.customer_name}
📧 <b>Email:</b> ${order.customer_email}
📅 <b>Datum:</b> ${new Date(order.created_at).toLocaleDateString('cs-CZ')}
📊 <b>Status:</b> ${order.status.toUpperCase()}

🛍️ <b>Produkty:</b>
${items}

💰 <b>Celkem:</b> ${(order.amount_total / 100).toFixed(2)} Kč`;
}

function getOrderActions(orderId: string, currentStatus: string) {
  const actions = [];

  if (currentStatus === 'new') {
    actions.push([
      { text: '✅ Potvrdit', callback_data: `confirm_${orderId}` },
      { text: '❌ Zrušit', callback_data: `cancel_${orderId}` },
    ]);
  } else if (currentStatus === 'confirmed' || currentStatus === 'paid') {
    actions.push([
      { text: '⚙️ Zpracovat', callback_data: `process_${orderId}` },
      { text: '📦 Expedovat', callback_data: `ship_${orderId}` },
    ]);
  } else if (currentStatus === 'processing') {
    actions.push([{ text: '📦 Expedovat', callback_data: `ship_${orderId}` }]);
  } else if (currentStatus === 'shipped') {
    actions.push([{ text: '✅ Doručeno', callback_data: `deliver_${orderId}` }]);
  }

  return { inline_keyboard: actions };
}

async function handleCommand(
  supabase: any,
  settings: TelegramSettings,
  chatId: string,
  command: string,
  args: string[]
) {
  switch (command) {
    case '/start':
    case '/help':
      return `🤖 <b>LABUTE STORE BOT</b>

📋 <b>Dostupné příkazy:</b>
/orders - Seznam posledních objednávek
/stats - Statistiky obchodu
/help - Tato nápověda

🔔 Bot automaticky odesílá notifikace o nových objednávkách a změnách stavů.`;

    case '/orders':
      const limit = args.length > 0 ? parseInt(args[0]) || 10 : 10;
      const orders = await getRecentOrders(supabase, Math.min(limit, 20));

      if (orders.length === 0) {
        return '📋 Žádné objednávky nenalezeny.';
      }

      return `📋 <b>Posledních ${orders.length} objednávek:</b>

${orders
  .map(
    (order) =>
      `• #${order.id} - ${order.customer_name} - ${(order.amount_total / 100).toFixed(2)} Kč - ${order.status.toUpperCase()}`
  )
  .join('\n')}

💡 <i>Pro detail použij: /detail [ID]</i>`;

    case '/stats':
      // Základní statistiky - můžete rozšířit podle potřeby
      const todayOrders = await supabase
        .from('orders')
        .select('amount_total')
        .gte('created_at', new Date().toISOString().split('T')[0]);

      const totalToday =
        todayOrders.data?.reduce((sum: number, order: any) => sum + order.amount_total, 0) || 0;

      return `📊 <b>STATISTIKY</b>

📅 <b>Dnes:</b>
• Objednávky: ${todayOrders.data?.length || 0}
• Tržby: ${(totalToday / 100).toFixed(2)} Kč

💡 <i>Více statistik bude k dispozici brzy...</i>`;

    case '/detail':
      if (args.length === 0) {
        return '❌ Zadej ID objednávky: /detail [ID]';
      }

      const orderId = args[0];
      const order = await getOrderById(supabase, orderId);

      if (!order) {
        return `❌ Objednávka #${orderId} nenalezena.`;
      }

      return formatOrder(order);

    default:
      return '❓ Neznámý příkaz. Použij /help pro nápovědu.';
  }
}

async function handleCallbackQuery(supabase: any, settings: TelegramSettings, callbackQuery: any) {
  const [action, orderId] = callbackQuery.data.split('_');
  const chatId = callbackQuery.message.chat.id.toString();

  let newStatus: string | null = null;
  let message = '';

  switch (action) {
    case 'confirm':
      newStatus = 'confirmed';
      message = '✅ Objednávka byla potvrzena';
      break;
    case 'process':
      newStatus = 'processing';
      message = '⚙️ Objednávka se zpracovává';
      break;
    case 'ship':
      newStatus = 'shipped';
      message = '📦 Objednávka byla expedována';
      break;
    case 'deliver':
      newStatus = 'delivered';
      message = '✅ Objednávka byla doručena';
      break;
    case 'cancel':
      newStatus = 'cancelled';
      message = '❌ Objednávka byla zrušena';
      break;
    case 'detail':
      const order = await getOrderById(supabase, orderId);
      if (order) {
        await sendTelegramMessage(
          settings.bot_token,
          chatId,
          formatOrder(order),
          getOrderActions(orderId, order.status)
        );
      }
      return;
    default:
      message = '❓ Neznámá akce';
  }

  if (newStatus) {
    const success = await updateOrderStatus(supabase, orderId, newStatus);
    if (success) {
      // Aktualizovat zprávu s novým statusem
      const updatedOrder = await getOrderById(supabase, orderId);
      if (updatedOrder) {
        await editTelegramMessage(
          settings.bot_token,
          chatId,
          callbackQuery.message.message_id,
          formatOrder(updatedOrder),
          getOrderActions(orderId, newStatus)
        );
      }
    } else {
      message = '❌ Chyba při aktualizaci objednávky';
    }
  }

  await answerCallbackQuery(settings.bot_token, callbackQuery.id, message);
}

Deno.serve(async (req: Request) => {
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', {
        status: 405,
        headers: corsHeaders,
      });
    }

    // Inicializace Supabase klienta
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Získání Telegram nastavení z databáze
    const { data: settingsData, error: settingsError } = await supabase
      .from('telegram_settings')
      .select('*')
      .single();

    if (settingsError || !settingsData) {
      console.error('Error fetching Telegram settings:', settingsError);
      return new Response(JSON.stringify({ error: 'Telegram not configured' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const settings: TelegramSettings = settingsData;

    // Parsování webhook payload
    const body = await req.text();
    let update: TelegramUpdate;

    try {
      update = JSON.parse(body);
    } catch (error) {
      console.error('Invalid JSON payload:', error);
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Logování pro debugging
    console.log('Received Telegram update:', JSON.stringify(update, null, 2));

    // Zpracování callback query (inline tlačítka)
    if (update.callback_query) {
      const chatId = update.callback_query.message?.chat.id.toString();

      if (!chatId || !settings.allowed_chat_ids.includes(chatId)) {
        await answerCallbackQuery(
          settings.bot_token,
          update.callback_query.id,
          '❌ Nejste autorizováni'
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await handleCallbackQuery(supabase, settings, update.callback_query);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Zpracování textových zpráv
    if (update.message?.text) {
      const chatId = update.message.chat.id.toString();
      const text = update.message.text;

      // Kontrola autorizace
      if (!settings.allowed_chat_ids.includes(chatId)) {
        await sendTelegramMessage(
          settings.bot_token,
          chatId,
          '❌ Nejste autorizováni k používání tohoto botu.'
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Rate limiting check (zde můžete implementovat pokročilejší logiku)
      // ...

      // Zpracování příkazů
      if (text.startsWith('/')) {
        const parts = text.split(' ');
        const command = parts[0];
        const args = parts.slice(1);

        const response = await handleCommand(supabase, settings, chatId, command, args);
        await sendTelegramMessage(settings.bot_token, chatId, response);
      } else {
        // Odpověď na neznámé zprávy
        await sendTelegramMessage(
          settings.bot_token,
          chatId,
          '👋 Ahoj! Použij /help pro seznam dostupných příkazů.'
        );
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in telegram-bot-secure:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
