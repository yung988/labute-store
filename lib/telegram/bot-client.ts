import {
  TelegramSendMessageRequest,
  TelegramEditMessageRequest,
  TelegramAnswerCallbackQueryRequest,
  TelegramWebhookInfo,
  TelegramMessageResult,
  TelegramUser,
  TelegramUpdate,
} from '../../types/telegram';

export class TelegramBotClient {
  private baseUrl: string;

  constructor(botToken: string) {
    this.baseUrl = `https://api.telegram.org/bot${botToken}`;
  }

  /**
   * Odeslání zprávy do Telegram chatu
   */
  async sendMessage(request: TelegramSendMessageRequest): Promise<TelegramMessageResult> {
    const response = await fetch(`${this.baseUrl}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(`Telegram API error: ${result.description || 'Unknown error'}`);
    }

    return result.result;
  }

  /**
   * Editace existující zprávy
   */
  async editMessage(request: TelegramEditMessageRequest): Promise<TelegramMessageResult | boolean> {
    const response = await fetch(`${this.baseUrl}/editMessageText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(`Telegram API error: ${result.description || 'Unknown error'}`);
    }

    return result.result;
  }

  /**
   * Odpověď na callback query (inline tlačítka)
   */
  async answerCallbackQuery(request: TelegramAnswerCallbackQueryRequest): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/answerCallbackQuery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(`Telegram API error: ${result.description || 'Unknown error'}`);
    }

    return result.result;
  }

  /**
   * Nastavení webhook URL
   */
  async setWebhook(url: string, allowedUpdates?: string[]): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        allowed_updates: allowedUpdates || ['message', 'callback_query'],
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(`Telegram API error: ${result.description || 'Unknown error'}`);
    }

    return result.result;
  }

  /**
   * Získání informací o webhook
   */
  async getWebhookInfo(): Promise<TelegramWebhookInfo> {
    const response = await fetch(`${this.baseUrl}/getWebhookInfo`);
    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(`Telegram API error: ${result.description || 'Unknown error'}`);
    }

    return result.result;
  }

  /**
   * Smazání webhook
   */
  async deleteWebhook(): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/deleteWebhook`, {
      method: 'POST',
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(`Telegram API error: ${result.description || 'Unknown error'}`);
    }

    return result.result;
  }

  /**
   * Získání informací o botovi
   */
  async getMe(): Promise<TelegramUser> {
    const response = await fetch(`${this.baseUrl}/getMe`);
    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(`Telegram API error: ${result.description || 'Unknown error'}`);
    }

    return result.result;
  }

  /**
   * Získání posledních aktualizací (pro testování)
   */
  async getUpdates(offset?: number, limit?: number): Promise<TelegramUpdate[]> {
    const params = new URLSearchParams();
    if (offset) params.append('offset', offset.toString());
    if (limit) params.append('limit', limit.toString());

    const response = await fetch(`${this.baseUrl}/getUpdates?${params}`);
    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(`Telegram API error: ${result.description || 'Unknown error'}`);
    }

    return result.result;
  }
}

/**
 * Utility funkce pro validaci webhook dat
 */
export function validateWebhookData(body: string): boolean {
  // Telegram nepoužívá HMAC signature jako GitHub/Stripe
  // Místo toho spoléháme na HTTPS a secret token v URL
  // Pro dodatečnou bezpečnost můžeme ověřit strukturu dat
  try {
    const data = JSON.parse(body);
    return data && typeof data.update_id === 'number';
  } catch {
    return false;
  }
}

/**
 * Utility funkce pro retry logiku
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts) {
        throw lastError;
      }

      // Exponential backoff
      const delay = delayMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Utility funkce pro escape HTML v Telegram zprávách
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Utility funkce pro truncate dlouhých zpráv
 */
export function truncateMessage(text: string, maxLength: number = 4096): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Utility funkce pro parsování callback data
 */
export function parseCallbackData(data: string): {
  action: string;
  orderId?: string;
  params?: Record<string, string>;
} {
  const parts = data.split('_');
  const action = parts[0];
  const orderId = parts[1];

  // Další parametry jako key=value
  const params: Record<string, string> = {};
  for (let i = 2; i < parts.length; i++) {
    const [key, value] = parts[i].split('=');
    if (key && value) {
      params[key] = value;
    }
  }

  return { action, orderId, params };
}

/**
 * Utility funkce pro vytvoření callback data
 */
export function createCallbackData(
  action: string,
  orderId?: string,
  params?: Record<string, string>
): string {
  let data = action;

  if (orderId) {
    data += `_${orderId}`;
  }

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      data += `_${key}=${value}`;
    }
  }

  return data;
}

/**
 * Utility funkce pro kontrolu admin oprávnění
 */
export function isAdminChat(chatId: string, adminChatIds: string[]): boolean {
  return adminChatIds.includes(chatId);
}

/**
 * Utility funkce pro logování Telegram chyb
 */
export function logTelegramError(error: Error, context: string): void {
  console.error(`[Telegram Bot Error - ${context}]:`, {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });
}
