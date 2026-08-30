export interface TelegramOperator {
  displayName: string;
  username: string;
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function sendTelegramMessage(text: string) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn("Telegram not configured, skipping notification");
    return;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text,
          parse_mode: "HTML",
        }),
      },
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Telegram error:", err);
    }
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
  }
}

export function formatTelegramMessage(
  action: "создание" | "изменение" | "удаление",
  entity: string,
  details: string,
  operator: TelegramOperator,
) {
  const time = new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date());

  return (
    `🏗 <b>SHLAKOBLOK CRM</b>\n` +
    `📋 <b>${action.toUpperCase()}</b>: ${entity}\n` +
    `🕐 ${time}\n\n` +
    `${details}\n\n` +
    `─────────────────\n` +
    `👤 <b>Оператор:</b> ${operator.displayName}\n` +
    `🔑 <b>Логин:</b> ${operator.username}`
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
  return (
    `🧱 <b>Новая продажа</b>\n\n` +
    `Клиент: ${params.carBrand} / ${params.licensePlate}\n` +
    `Количество: ${params.quantity} шт\n` +
    `Цена: ${params.pricePerUnit.toLocaleString("ru-RU")} сум\n` +
    `Сумма: ${params.totalPrice.toLocaleString("ru-RU")} сум\n` +
    `Оплата: ${params.paymentLabel}\n\n` +
    `👤 ${params.operator.displayName}`
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
  if (params.fullyClosed) {
    return (
      `✅ <b>Предоплата полностью закрыта</b>\n\n` +
      `Клиент: ${params.carBrand} / ${params.licensePlate}\n` +
      `Всего: ${params.totalPurchased} шт\n` +
      `Выдано: ${params.totalDelivered} шт\n` +
      `Остаток: 0\n` +
      `Остаток предоплаты: 0 сум\n\n` +
      `👤 ${params.operator.displayName}`
    );
  }

  return (
    `🚚 <b>Выдача товара</b>\n\n` +
    `Клиент: ${params.carBrand} / ${params.licensePlate}\n` +
    `Выдано сейчас: ${params.deliveredNow} шт\n` +
    `Всего оплачено: ${params.totalPurchased} шт\n` +
    `Всего выдано: ${params.totalDelivered} шт\n` +
    `Осталось: ${params.remaining} шт\n` +
    `Остаток предоплаты: ${params.prepaymentRemaining.toLocaleString("ru-RU")} сум\n\n` +
    `👤 ${params.operator.displayName}`
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
