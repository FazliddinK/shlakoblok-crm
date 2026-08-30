import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  sendTelegramMessage,
  formatTelegramMessage,
  operatorFromSession,
} from "@/lib/telegram";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;

  if (id === auth.session.userId) {
    return NextResponse.json(
      { error: "Нельзя удалить свой аккаунт" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  await prisma.user.delete({ where: { id } });

  await sendTelegramMessage(
    formatTelegramMessage(
      "удаление",
      "Пользователь",
      `👤 Имя: ${user.displayName}\n🔑 Логин: ${user.username}`,
      operatorFromSession(auth.session),
    ),
  );

  return NextResponse.json({ ok: true });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const { password } = await request.json();

  if (!password?.trim() || password.length < 6) {
    return NextResponse.json(
      { error: "Пароль должен быть не менее 6 символов" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { id },
    data: { passwordHash },
  });

  await sendTelegramMessage(
    formatTelegramMessage(
      "изменение",
      "Пароль пользователя",
      `👤 Имя: ${user.displayName}\n🔑 Логин: ${user.username}\n🔒 Пароль изменён администратором`,
      operatorFromSession(auth.session),
    ),
  );

  return NextResponse.json({ ok: true });
}
