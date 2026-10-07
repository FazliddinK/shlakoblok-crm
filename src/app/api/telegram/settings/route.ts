import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  inspectTelegramConfig,
  saveTelegramSettings,
} from "@/lib/telegram";

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const botToken = typeof body.botToken === "string" ? body.botToken.trim() : "";
  const chatId = typeof body.chatId === "string" ? body.chatId.trim() : "";

  if (!chatId) {
    return NextResponse.json(
      { error: "Укажите ID Telegram-группы" },
      { status: 400 },
    );
  }

  try {
    const saved = await saveTelegramSettings({ botToken, chatId });
    const status = await inspectTelegramConfig(
      saved.botToken,
      saved.chatId,
      "database",
    );

    return NextResponse.json(status);
  } catch (error) {
    console.error("Failed to save Telegram settings");
    return NextResponse.json(
      { error: "Не удалось сохранить настройки Telegram" },
      { status: 400 },
    );
  }
}
