import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

Deno.serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Get Telegram settings
    const settingsResponse = await fetch(
      `${supabaseUrl}/rest/v1/telegram_settings?notifications_enabled=eq.true&select=bot_token,admin_chat_id`,
      {
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          apikey: supabaseServiceKey,
        },
      }
    );
    const settings = await settingsResponse.json();

    if (!settings || settings.length === 0) {
      return new Response(JSON.stringify({ error: 'No Telegram settings found' }), { status: 500 });
    }

    const { bot_token, admin_chat_id } = settings[0];

    // Get pending notifications
    const notificationsResponse = await fetch(
      `${supabaseUrl}/rest/v1/telegram_notification_queue?status=eq.pending&attempts=lt.max_attempts&next_attempt_at=lte.${new Date().toISOString()}&order=created_at.asc&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          apikey: supabaseServiceKey,
        },
      }
    );
    const notifications = await notificationsResponse.json();

    if (!notifications || notifications.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0, failed: 0, total: 0 }));
    }

    let processed = 0;
    let failed = 0;

    for (const notification of notifications) {
      try {
        const order = notification.payload.record;

        // Parse items if they're a JSON string
        let items: any[] = [];
        if (typeof order.items === 'string') {
          try {
            items = JSON.parse(order.items);
          } catch (e) {
            console.error('Error parsing items JSON:', e);
            items = [];
          }
        } else if (Array.isArray(order.items)) {
          items = order.items;
        }

        const itemsList = items
          .map((item: any) => {
            const name = item.description || item.product_name || 'Neznámý produkt';
            const quantity = item.quantity || 1;
            const size = item.size ? ` (${item.size})` : '';
            return `• ${name}${size} - ${quantity}ks`;
          })
          .join('\n');

        const total = (order.amount_total / 100).toFixed(2);
        const deliveryMethod = order.delivery_method === 'pickup' ? 'Zásilkovna' : 'Doručení';

        const message = `🛍️ <b>Nová objednávka!</b>

👤 <b>Zákazník:</b> ${order.customer_name}
📧 <b>Email:</b> ${order.customer_email}
📱 <b>Telefon:</b> ${order.customer_phone}

📦 <b>Položky:</b>
${itemsList}

💰 <b>Celkem:</b> ${total} Kč
🚚 <b>Doručení:</b> ${deliveryMethod}
${order.packeta_point_id ? `📍 <b>Výdejní místo:</b> ${order.packeta_point_id}` : ''}

🆔 <b>ID objednávky:</b> ${order.id}
⏰ <b>Čas:</b> ${new Date(order.created_at).toLocaleString('cs-CZ')}`;

        // Send Telegram message
        const telegramResponse = await fetch(
          `https://api.telegram.org/bot${bot_token}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: admin_chat_id,
              text: message,
              parse_mode: 'HTML',
            }),
          }
        );

        const telegramResult = await telegramResponse.json();

        if (telegramResult.ok) {
          // Mark as sent
          await fetch(
            `${supabaseUrl}/rest/v1/telegram_notification_queue?id=eq.${notification.id}`,
            {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${supabaseServiceKey}`,
                apikey: supabaseServiceKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                status: 'sent',
                updated_at: new Date().toISOString(),
              }),
            }
          );

          // Update order
          await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${notification.order_id}`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${supabaseServiceKey}`,
              apikey: supabaseServiceKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              telegram_notified: true,
              telegram_notification_sent_at: new Date().toISOString(),
            }),
          });

          processed++;
        } else {
          throw new Error(`Telegram API error: ${JSON.stringify(telegramResult)}`);
        }
      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error);

        const newAttempts = notification.attempts + 1;
        const nextAttempt = new Date();
        nextAttempt.setMinutes(nextAttempt.getMinutes() + newAttempts * 5);

        await fetch(`${supabaseUrl}/rest/v1/telegram_notification_queue?id=eq.${notification.id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${supabaseServiceKey}`,
            apikey: supabaseServiceKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            attempts: newAttempts,
            error_message: error.message,
            next_attempt_at: nextAttempt.toISOString(),
            status: newAttempts >= notification.max_attempts ? 'failed' : 'pending',
            updated_at: new Date().toISOString(),
          }),
        });

        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        failed,
        total: notifications.length,
      })
    );
  } catch (error) {
    console.error('Queue processor error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
