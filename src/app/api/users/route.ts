import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  sendTelegramMessage,
  formatTelegramMessage,
  operatorFromSession,
} from "@/lib/telegram";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      createdAt: true,
      _count: { select: { sales: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { username, displayName, password, role } = body;

  if (!username?.trim() || !displayName?.trim() || !password?.trim()) {
    return NextResponse.json(
      { error: "Логин, имя и пароль обязательны" },
      { status: 400 },
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Пароль должен быть не менее 6 символов" },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({
    where: { username: username.trim() },
  });

  if (existing) {
    return NextResponse.json({ error: "Такой логин уже занят" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      username: username.trim(),
      displayName: displayName.trim(),
      passwordHash,
      role: role === "admin" ? "admin" : "operator",
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      createdAt: true,
    },
  });

  await sendTelegramMessage(
    formatTelegramMessage(
      "создание",
      "Пользователь",
      `👤 Имя: ${user.displayName}\n🔑 Логин: ${user.username}\n🏷 Роль: ${user.role === "admin" ? "Администратор" : "Оператор"}`,
      operatorFromSession(auth.session),
    ),
  );

  return NextResponse.json(user, { status: 201 });
}
