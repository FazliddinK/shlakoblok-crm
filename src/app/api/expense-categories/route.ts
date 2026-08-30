import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { sendTelegramMessage, formatTelegramMessage, operatorFromSession } from "@/lib/telegram";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const categories = await prisma.expenseCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { expenses: true } } },
  });

  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { name } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Укажите название категории" }, { status: 400 });
  }

  const existing = await prisma.expenseCategory.findUnique({
    where: { name: name.trim() },
  });
  if (existing) {
    return NextResponse.json(existing);
  }

  const category = await prisma.expenseCategory.create({
    data: { name: name.trim() },
  });

  await sendTelegramMessage(
    formatTelegramMessage(
      "создание",
      "Категория расходов",
      `📁 ${category.name}`,
      operatorFromSession(auth.session),
    ),
  );

  return NextResponse.json(category, { status: 201 });
}
