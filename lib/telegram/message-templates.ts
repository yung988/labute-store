import { OrderSummary, OrderStatus, TelegramInlineKeyboardButton } from '../../types/telegram';

// Emoji konstanty pro různé typy notifikací
export const NOTIFICATION_EMOJIS = {
  new_order: '📦',
  payment_received: '💰',
  status_change: '📋',
  shipping_update: '🚚',
  delivered: '✅',
  cancelled: '❌',
  refunded: '💸',
  confirmed: '✅',
  processing: '⚙️',
  shipped: '🚚',
  error: '⚠️',
  success: '✅',
  info: 'ℹ️',
  warning: '⚠️',
} as const;

// Status emoji mapování
export const STATUS_EMOJIS: Record<OrderStatus, string> = {
  new: '🆕',
  confirmed: '✅',
  paid: '💰',
  processing: '⚙️',
  shipped: '🚚',
  delivered: '📦',
  cancelled: '❌',
  refunded: '💸',
};

// Formátování ceny v českých korunách
export const formatPrice = (cents: number): string => {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
  }).format(cents / 100);
};

// Formátování data a času
export const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Template pro novou objednávku
export const newOrderTemplate = (order: OrderSummary): string => {
  const itemsList = order.items
    .map(
      (item) =>
        `• ${item.product_name}${item.size ? ` (${item.size})` : ''} - ${item.quantity}ks - ${formatPrice(item.price_cents)}`
    )
    .join('\n');

  return `${NOTIFICATION_EMOJIS.new_order} <b>NOVÁ OBJEDNÁVKA</b>

📋 <b>Číslo:</b> #${order.id}
👤 <b>Zákazník:</b> ${order.customer_name}
📧 <b>Email:</b> ${order.customer_email}
📅 <b>Vytvořeno:</b> ${formatDateTime(order.created_at)}

🛍️ <b>Produkty:</b>
${itemsList}

💰 <b>Celkem:</b> ${formatPrice(order.amount_total)}
📊 <b>Status:</b> ${STATUS_EMOJIS[order.status]} ${order.status.toUpperCase()}`;
};

// Template pro změnu statusu
export const statusChangeTemplate = (
  order: OrderSummary,
  oldStatus: OrderStatus,
  newStatus: OrderStatus
): string => {
  return `${NOTIFICATION_EMOJIS.status_change} <b>ZMĚNA STAVU OBJEDNÁVKY</b>

📋 <b>Číslo:</b> #${order.id}
👤 <b>Zákazník:</b> ${order.customer_name}

📊 <b>Status:</b> ${STATUS_EMOJIS[oldStatus]} ${oldStatus.toUpperCase()} → ${STATUS_EMOJIS[newStatus]} ${newStatus.toUpperCase()}
📅 <b>Změněno:</b> ${formatDateTime(new Date().toISOString())}

💰 <b>Celkem:</b> ${formatPrice(order.amount_total)}`;
};

// Template pro přijatou platbu
export const paymentReceivedTemplate = (order: OrderSummary): string => {
  return `${NOTIFICATION_EMOJIS.payment_received} <b>PLATBA PŘIJATA</b>

📋 <b>Objednávka:</b> #${order.id}
👤 <b>Zákazník:</b> ${order.customer_name}
💰 <b>Částka:</b> ${formatPrice(order.amount_total)}
📅 <b>Zaplaceno:</b> ${formatDateTime(new Date().toISOString())}

✅ Objednávka je připravena ke zpracování!`;
};

// Template pro expedici
export const shippingUpdateTemplate = (order: OrderSummary, trackingInfo?: string): string => {
  let message = `${NOTIFICATION_EMOJIS.shipping_update} <b>OBJEDNÁVKA EXPEDOVÁNA</b>

📋 <b>Číslo:</b> #${order.id}
👤 <b>Zákazník:</b> ${order.customer_name}
📅 <b>Expedováno:</b> ${formatDateTime(new Date().toISOString())}`;

  if (trackingInfo) {
    message += `\n🔍 <b>Sledování:</b> ${trackingInfo}`;
  }

  return message;
};

// Template pro doručení
export const deliveredTemplate = (order: OrderSummary): string => {
  return `${NOTIFICATION_EMOJIS.delivered} <b>OBJEDNÁVKA DORUČENA</b>

📋 <b>Číslo:</b> #${order.id}
👤 <b>Zákazník:</b> ${order.customer_name}
📅 <b>Doručeno:</b> ${formatDateTime(new Date().toISOString())}

🎉 Objednávka byla úspěšně doručena!`;
};

// Quick action tlačítka pro nové objednávky
export const getNewOrderActions = (orderId: string): TelegramInlineKeyboardButton[][] => {
  return [
    [
      { text: '✅ Potvrdit', callback_data: `confirm_${orderId}` },
      { text: '📦 Expedovat', callback_data: `ship_${orderId}` },
    ],
    [
      { text: '📋 Detail', callback_data: `detail_${orderId}` },
      { text: '❌ Zrušit', callback_data: `cancel_${orderId}` },
    ],
  ];
};

// Quick action tlačítka pro různé statusy
export const getStatusActions = (
  orderId: string,
  currentStatus: OrderStatus
): TelegramInlineKeyboardButton[][] => {
  const actions: TelegramInlineKeyboardButton[][] = [];

  switch (currentStatus) {
    case 'new':
      actions.push([
        { text: '✅ Potvrdit', callback_data: `confirm_${orderId}` },
        { text: '❌ Zrušit', callback_data: `cancel_${orderId}` },
      ]);
      break;
    case 'confirmed':
    case 'paid':
      actions.push([
        { text: '⚙️ Zpracovat', callback_data: `process_${orderId}` },
        { text: '📦 Expedovat', callback_data: `ship_${orderId}` },
      ]);
      break;
    case 'processing':
      actions.push([{ text: '📦 Expedovat', callback_data: `ship_${orderId}` }]);
      break;
    case 'shipped':
      actions.push([{ text: '✅ Doručeno', callback_data: `deliver_${orderId}` }]);
      break;
  }

  // Vždy přidat detail tlačítko
  actions.push([{ text: '📋 Zobrazit detail', callback_data: `detail_${orderId}` }]);

  return actions;
};

// Template pro statistiky
export const statsTemplate = (stats: {
  today: { count: number; revenue: number };
  week: { count: number; revenue: number };
  month: { count: number; revenue: number };
  pending_orders: number;
}): string => {
  return `📊 <b>STATISTIKY OBCHODU</b>

📅 <b>Dnes:</b>
• Objednávky: ${stats.today.count}
• Tržby: ${formatPrice(stats.today.revenue)}

📅 <b>Tento týden:</b>
• Objednávky: ${stats.week.count}
• Tržby: ${formatPrice(stats.week.revenue)}

📅 <b>Tento měsíc:</b>
• Objednávky: ${stats.month.count}
• Tržby: ${formatPrice(stats.month.revenue)}

⏳ <b>Čekající objednávky:</b> ${stats.pending_orders}`;
};

// Template pro help zprávu
export const helpTemplate = (): string => {
  return `🤖 <b>YEEZUZ2020 BOT - NÁPOVĚDA</b>

📋 <b>Dostupné příkazy:</b>

/orders - Seznam posledních objednávek
/stats - Statistiky obchodu
/help - Tato nápověda

🔔 <b>Automatické notifikace:</b>
• 📦 Nové objednávky
• 💰 Přijaté platby
• 📋 Změny stavů
• 🚚 Expedice
• ✅ Doručení

⚡ <b>Quick Actions:</b>
Použij tlačítka pod zprávami pro rychlé akce s objednávkami.

❓ <b>Potřebuješ pomoc?</b>
Kontaktuj vývojáře nebo zkontroluj dokumentaci.`;
};

// Template pro error zprávy
export const errorTemplate = (error: string): string => {
  return `${NOTIFICATION_EMOJIS.error} <b>CHYBA</b>

❌ ${error}

Zkus to prosím znovu nebo kontaktuj administrátora.`;
};

// Template pro success zprávy
export const successTemplate = (message: string): string => {
  return `${NOTIFICATION_EMOJIS.success} <b>ÚSPĚCH</b>

✅ ${message}`;
};

// Notification templates mapování
export const NOTIFICATION_TEMPLATES = {
  new_order: {
    type: 'new_order',
    emoji: NOTIFICATION_EMOJIS.new_order,
    title: 'NOVÁ OBJEDNÁVKA',
    format: newOrderTemplate,
  },
  status_change: {
    type: 'status_change',
    emoji: NOTIFICATION_EMOJIS.status_change,
    title: 'ZMĚNA STAVU',
    format: statusChangeTemplate,
  },
  payment_received: {
    type: 'payment_received',
    emoji: NOTIFICATION_EMOJIS.payment_received,
    title: 'PLATBA PŘIJATA',
    format: paymentReceivedTemplate,
  },
  shipping_update: {
    type: 'shipping_update',
    emoji: NOTIFICATION_EMOJIS.shipping_update,
    title: 'EXPEDOVÁNO',
    format: shippingUpdateTemplate,
  },
  delivered: {
    type: 'delivered',
    emoji: NOTIFICATION_EMOJIS.delivered,
    title: 'DORUČENO',
    format: deliveredTemplate,
  },
};
