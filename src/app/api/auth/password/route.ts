import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  sendTelegramMessage,
  formatTelegramMessage,
  operatorFromSession,
} from "@/lib/telegram";

export async function PUT(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Укажите текущий и новый пароль" },
      { status: 400 },
    );
  }

  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: "Новый пароль должен быть не менее 6 символов" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.session.userId },
  });

  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "Неверный текущий пароль" }, { status: 401 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  await sendTelegramMessage(
    formatTelegramMessage(
      "изменение",
      "Смена пароля",
      `👤 ${user.displayName} (${user.username}) сменил свой пароль`,
      operatorFromSession(auth.session),
    ),
  );

  return NextResponse.json({ ok: true });
}
