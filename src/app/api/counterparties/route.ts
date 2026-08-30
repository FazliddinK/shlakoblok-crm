import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { sendTelegramMessage, formatTelegramMessage, operatorFromSession } from "@/lib/telegram";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const search = request.nextUrl.searchParams.get("search") ?? "";

  const counterparties = await prisma.counterparty.findMany({
    where: search ? { name: { contains: search } } : undefined,
    orderBy: { name: "asc" },
    include: { _count: { select: { expenses: true } } },
  });

  return NextResponse.json(counterparties);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { name, phone, notes } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Укажите название контрагента" }, { status: 400 });
  }

  const existing = await prisma.counterparty.findFirst({
    where: { name: name.trim() },
  });
  if (existing) {
    return NextResponse.json(existing);
  }

  const counterparty = await prisma.counterparty.create({
    data: {
      name: name.trim(),
      phone: phone?.trim() ?? "",
      notes: notes?.trim() ?? "",
    },
  });

  await sendTelegramMessage(
    formatTelegramMessage(
      "создание",
      "Контрагент",
      `🏢 ${counterparty.name}`,
      operatorFromSession(auth.session),
    ),
  );

  return NextResponse.json(counterparty, { status: 201 });
}
