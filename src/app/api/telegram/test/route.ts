import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  formatTelegramTestMessage,
  getTelegramStatus,
  sendTelegramMessage,
} from "@/lib/telegram";

export async function POST() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const status = await getTelegramStatus();
  if (!status.configured) {
    return NextResponse.json(
      { error: "Telegram не настроен" },
      { status: 400 },
    );
  }

  const ok = await sendTelegramMessage(formatTelegramTestMessage());
  if (!ok) {
    return NextResponse.json(
      { error: "Не удалось отправить тестовое сообщение" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
