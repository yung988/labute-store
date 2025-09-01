// Telegram Bot API Types
export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  date: number;
  chat: TelegramChat;
  text?: string;
  reply_markup?: TelegramInlineKeyboardMarkup;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramWebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
  max_connections?: number;
  allowed_updates?: string[];
}

// Inline Keyboard Types
export interface TelegramInlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface TelegramInlineKeyboardMarkup {
  inline_keyboard: TelegramInlineKeyboardButton[][];
}

// Bot Response Types
export interface TelegramSendMessageRequest {
  chat_id: string | number;
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disable_web_page_preview?: boolean;
  reply_markup?: TelegramInlineKeyboardMarkup;
}

export interface TelegramEditMessageRequest {
  chat_id: string | number;
  message_id: number;
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  reply_markup?: TelegramInlineKeyboardMarkup;
}

export interface TelegramAnswerCallbackQueryRequest {
  callback_query_id: string;
  text?: string;
  show_alert?: boolean;
}

// Database Types
export interface TelegramSettings {
  id: string;
  bot_token: string;
  admin_chat_id: string;
  webhook_url?: string;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface TelegramNotification {
  id: string;
  order_id?: string;
  chat_id: string;
  message_type: NotificationMessageType;
  message_text: string;
  telegram_message_id?: number;
  status: NotificationStatus;
  error_message?: string;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

// Notification Types
export type NotificationMessageType =
  | 'new_order'
  | 'status_change'
  | 'payment_received'
  | 'shipping_update'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type NotificationStatus = 'sent' | 'failed' | 'retry';

export type OrderStatus =
  | 'new'
  | 'confirmed'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

// Bot Command Types
export interface BotCommand {
  command: string;
  description: string;
  handler: (update: TelegramUpdate, args: string[]) => Promise<void>;
}

export interface OrderSummary {
  id: string;
  customer_name: string;
  customer_email: string;
  amount_total: number;
  status: OrderStatus;
  created_at: string;
  items: OrderItem[];
}

export interface OrderItem {
  product_name: string;
  size?: string;
  quantity: number;
  price_cents: number;
}

// Quick Action Types
export interface QuickAction {
  action: string;
  order_id: string;
  new_status?: OrderStatus;
}

// Notification Template Types
export interface NotificationTemplate {
  type: NotificationMessageType;
  emoji: string;
  title: string;
  format: (data: any) => string;
  actions?: TelegramInlineKeyboardButton[];
}

// Error Types
export interface TelegramError {
  error_code: number;
  description: string;
}

// Webhook Validation Types
export interface WebhookValidation {
  isValid: boolean;
  error?: string;
}

// Statistics Types
export interface OrderStats {
  today: {
    count: number;
    revenue: number;
  };
  week: {
    count: number;
    revenue: number;
  };
  month: {
    count: number;
    revenue: number;
  };
  pending_orders: number;
}

// Configuration Types
export interface BotConfig {
  bot_token: string;
  admin_chat_ids: string[];
  webhook_url?: string;
  notifications_enabled: boolean;
  max_retry_attempts: number;
  retry_delay_ms: number;
}

// API Response Types
export interface TelegramApiResponse<T = unknown> {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
}

export interface TelegramMessageResult {
  message_id: number;
  from: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
}

// Utility Types
export type MessageFormatter = (data: unknown) => string;
export type ActionHandler = (callbackQuery: TelegramCallbackQuery) => Promise<void>;
