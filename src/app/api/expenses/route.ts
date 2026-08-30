import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getFinanceSummary, archiveRecord } from "@/lib/finance";
import { sendTelegramMessage, formatTelegramMessage, operatorFromSession } from "@/lib/telegram";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const [expenses, summary] = await Promise.all([
    prisma.expense.findMany({
      include: {
        category: true,
        counterparty: true,
        user: { select: { displayName: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    getFinanceSummary(),
  ]);

  return NextResponse.json({ expenses, summary });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { categoryName, counterpartyName, amount, note, categoryId, counterpartyId } = body;

  const amt = Number(amount);
  if (!amt || amt <= 0) {
    return NextResponse.json({ error: "Укажите сумму расхода" }, { status: 400 });
  }

  let resolvedCategoryId = categoryId;
  if (!resolvedCategoryId && categoryName?.trim()) {
    const cat = await prisma.expenseCategory.upsert({
      where: { name: categoryName.trim() },
      update: {},
      create: { name: categoryName.trim() },
    });
    resolvedCategoryId = cat.id;
  }

  let resolvedCounterpartyId = counterpartyId;
  if (!resolvedCounterpartyId && counterpartyName?.trim()) {
    let cp = await prisma.counterparty.findFirst({
      where: { name: counterpartyName.trim() },
    });
    if (!cp) {
      cp = await prisma.counterparty.create({
        data: { name: counterpartyName.trim() },
      });
    }
    resolvedCounterpartyId = cp.id;
  }

  if (!resolvedCategoryId || !resolvedCounterpartyId) {
    return NextResponse.json(
      { error: "Укажите категорию и контрагента" },
      { status: 400 },
    );
  }

  const expense = await prisma.expense.create({
    data: {
      categoryId: resolvedCategoryId,
      counterpartyId: resolvedCounterpartyId,
      amount: amt,
      note: note?.trim() ?? "",
      userId: auth.session.userId,
    },
    include: {
      category: true,
      counterparty: true,
      user: { select: { displayName: true } },
    },
  });

  await sendTelegramMessage(
    formatTelegramMessage(
      "создание",
      "Расход",
      `📁 ${expense.category.name}\n🏢 ${expense.counterparty.name}\n💸 ${expense.amount} сум\n📝 ${expense.note || "—"}`,
      operatorFromSession(auth.session),
    ),
  );

  return NextResponse.json(expense, { status: 201 });
}
