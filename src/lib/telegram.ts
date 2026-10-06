import { BUSINESS_TIME_ZONE } from "@/lib/dates";
import { formatCurrency } from "@/lib/labels";
import { Locale, localeToIntl, normalizeLocale, translate } from "@/lib/i18n";

export interface TelegramOperator {
  displayName: string;
  username: string;
}

export interface TelegramStatus {
  configured: boolean;
  botUsername?: string;
  botName?: string;
  chatId?: string;
  chatTitle?: string;
  chatType?: string;
  isBotAdmin?: boolean;
  error?: string;
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_LOCALE: Locale = normalizeLocale(process.env.TELEGRAM_LOCALE);
const TELEGRAM_TIMEOUT_MS = 6000;

function telegramT(source: string) {
  return translate(TELEGRAM_LOCALE, source);
}

function telegramTime() {
  return new Intl.DateTimeFormat(localeToIntl(TELEGRAM_LOCALE), {
    timeZone: BUSINESS_TIME_ZONE,
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date());
}

export function escapeTelegramHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function localizeLegacyDetails(details: string): string {
  let result = details;

  if (TELEGRAM_LOCALE === "uz") {
    const replacements: Array<[string, string]> = [
      ["Марка:", "Marka:"],
      ["Гос. номер:", "Davlat raqami:"],
      ["Телефон:", "Telefon:"],
      ["Баланс:", "Balans:"],
      ["Имя:", "Ism:"],
      ["Логин:", "Login:"],
      ["Роль:", "Rol:"],
      ["Оплачено:", "To‘landi:"],
      ["Долг:", "Qarz:"],
      ["Переплата/предоплата:", "Ortiqcha/oldindan to‘lov:"],
      ["Пароль изменён администратором", "Parol administrator tomonidan o‘zgartirildi"],
      ["Администратор", "Administrator"],
      ["Оператор", "Operator"],
    ];

    for (const [from, to] of replacements) result = result.replaceAll(from, to);

    result = result.replace(/Выдано:\s*(\d+)\s*из\s*(\d+)\s*шт/g, "Berildi: $1 / $2 dona");
    result = result.replace(/(\d+)\s*шт/g, "$1 dona");
    result = result.replace(/\sсум\b/g, " so‘m");
  } else {
    result = result.replace(/\sso‘m\b/g, " сум");
    result = result.replace(/(\d+)\s*dona/g, "$1 шт");
  }

  return result;
}

async function telegramApi<T>(
  method: string,
  body: Record<string, unknown>,
): Promise<{ ok: true; result: T } | { ok: false; error: string }> {
  if (!BOT_TOKEN) return { ok: false, error: "Telegram bot token is not configured" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as
      | { ok?: boolean; result?: T; description?: string }
      | null;

    if (!response.ok || !payload?.ok || payload.result === undefined) {
      return {
        ok: false,
        error: payload?.description || `Telegram API ${method} failed`,
      };
    }

    return { ok: true, result: payload.result };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Telegram request timed out"
        : "Telegram request failed";
    return { ok: false, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendTelegramMessage(text: string): Promise<boolean> {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn("Telegram not configured, skipping notification");
    return false;
  }

  const response = await telegramApi<unknown>("sendMessage", {
    chat_id: CHAT_ID,
    text,
    parse_mode: "HTML",
  });

  if (!response.ok) {
    console.error("Telegram notification failed:", response.error);
    return false;
  }

  return true;
}

export function formatTelegramMessage(
  action: "создание" | "изменение" | "удаление",
  entity: string,
  details: string,
  operator: TelegramOperator,
) {
  const localizedDetails = localizeLegacyDetails(details);

  return (
    `🏗 <b>SHLAKOBLOK CRM</b>\n` +
    `📋 <b>${escapeTelegramHtml(telegramT(action).toUpperCase())}</b>: ${escapeTelegramHtml(telegramT(entity))}\n` +
    `🕐 ${escapeTelegramHtml(telegramTime())}\n\n` +
    `${escapeTelegramHtml(localizedDetails)}\n\n` +
    `─────────────────\n` +
    `👤 <b>${escapeTelegramHtml(telegramT("Оператор"))}:</b> ${escapeTelegramHtml(operator.displayName)}\n` +
    `🔑 <b>${escapeTelegramHtml(telegramT("Логин"))}:</b> ${escapeTelegramHtml(operator.username)}`
  );
}

export function formatSaleTelegramMessage(params: {
  carBrand: string;
  licensePlate: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  paymentLabel: string;
  operator: TelegramOperator;
}) {
  const unit = TELEGRAM_LOCALE === "ru" ? "шт" : "dona";

  return (
    `🧱 <b>${escapeTelegramHtml(telegramT("Новая продажа"))}</b>\n\n` +
    `${escapeTelegramHtml(telegramT("Клиент"))}: ${escapeTelegramHtml(params.carBrand)} / ${escapeTelegramHtml(params.licensePlate)}\n` +
    `${escapeTelegramHtml(telegramT("Количество"))}: ${params.quantity} ${unit}\n` +
    `${escapeTelegramHtml(telegramT("Цена"))}: ${escapeTelegramHtml(formatCurrency(params.pricePerUnit, TELEGRAM_LOCALE))}\n` +
    `${escapeTelegramHtml(telegramT("Сумма"))}: ${escapeTelegramHtml(formatCurrency(params.totalPrice, TELEGRAM_LOCALE))}\n` +
    `${escapeTelegramHtml(localizeLegacyDetails(params.paymentLabel))}\n\n` +
    `👤 ${escapeTelegramHtml(params.operator.displayName)}`
  );
}

export function formatDeliveryTelegramMessage(params: {
  carBrand: string;
  licensePlate: string;
  deliveredNow: number;
  totalPurchased: number;
  totalDelivered: number;
  remaining: number;
  prepaymentRemaining: number;
  operator: TelegramOperator;
  fullyClosed?: boolean;
}) {
  const unit = TELEGRAM_LOCALE === "ru" ? "шт" : "dona";

  if (params.fullyClosed) {
    return (
      `✅ <b>${escapeTelegramHtml(telegramT("Предоплата полностью закрыта"))}</b>\n\n` +
      `${escapeTelegramHtml(telegramT("Клиент"))}: ${escapeTelegramHtml(params.carBrand)} / ${escapeTelegramHtml(params.licensePlate)}\n` +
      `${escapeTelegramHtml(telegramT("Всего"))}: ${params.totalPurchased} ${unit}\n` +
      `${escapeTelegramHtml(telegramT("Выдано"))}: ${params.totalDelivered} ${unit}\n` +
      `${escapeTelegramHtml(telegramT("Остаток"))}: 0\n` +
      `${escapeTelegramHtml(telegramT("Остаток предоплаты"))}: ${escapeTelegramHtml(formatCurrency(0, TELEGRAM_LOCALE))}\n\n` +
      `👤 ${escapeTelegramHtml(params.operator.displayName)}`
    );
  }

  return (
    `🚚 <b>${escapeTelegramHtml(telegramT("Выдача товара"))}</b>\n\n` +
    `${escapeTelegramHtml(telegramT("Клиент"))}: ${escapeTelegramHtml(params.carBrand)} / ${escapeTelegramHtml(params.licensePlate)}\n` +
    `${escapeTelegramHtml(telegramT("Выдано сейчас"))}: ${params.deliveredNow} ${unit}\n` +
    `${escapeTelegramHtml(telegramT("Всего оплачено"))}: ${params.totalPurchased} ${unit}\n` +
    `${escapeTelegramHtml(telegramT("Всего выдано"))}: ${params.totalDelivered} ${unit}\n` +
    `${escapeTelegramHtml(telegramT("Осталось"))}: ${params.remaining} ${unit}\n` +
    `${escapeTelegramHtml(telegramT("Остаток предоплаты"))}: ${escapeTelegramHtml(formatCurrency(params.prepaymentRemaining, TELEGRAM_LOCALE))}\n\n` +
    `👤 ${escapeTelegramHtml(params.operator.displayName)}`
  );
}

export async function getTelegramStatus(): Promise<TelegramStatus> {
  if (!BOT_TOKEN || !CHAT_ID) return { configured: false };

  const me = await telegramApi<{
    id: number;
    username?: string;
    first_name?: string;
  }>("getMe", {});

  if (!me.ok) return { configured: true, chatId: CHAT_ID, error: me.error };

  const chat = await telegramApi<{
    id: number;
    title?: string;
    type?: string;
  }>("getChat", { chat_id: CHAT_ID });

  if (!chat.ok) {
    return {
      configured: true,
      botUsername: me.result.username,
      botName: me.result.first_name,
      chatId: CHAT_ID,
      error: chat.error,
    };
  }

  const member = await telegramApi<{ status?: string }>("getChatMember", {
    chat_id: CHAT_ID,
    user_id: me.result.id,
  });

  const memberStatus = member.ok ? member.result.status : undefined;
  const isBotAdmin = memberStatus === "administrator" || memberStatus === "creator";

  return {
    configured: true,
    botUsername: me.result.username,
    botName: me.result.first_name,
    chatId: String(chat.result.id ?? CHAT_ID),
    chatTitle: chat.result.title,
    chatType: chat.result.type,
    isBotAdmin,
    error: member.ok ? undefined : member.error,
  };
}

export function formatTelegramTestMessage() {
  return (
    `✅ <b>SHLAKOBLOK CRM</b>\n` +
    `${escapeTelegramHtml(telegramT("Уведомления Telegram успешно подключены."))}\n` +
    `${escapeTelegramHtml(telegramT("Время"))}: ${escapeTelegramHtml(telegramTime())}`
  );
}

export function operatorFromSession(session: {
  displayName: string;
  username: string;
}): TelegramOperator {
  return {
    displayName: session.displayName,
    username: session.username,
  };
}
