import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { archiveRecord } from "@/lib/finance";
import { sendTelegramMessage, formatTelegramMessage, operatorFromSession } from "@/lib/telegram";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { category: true, counterparty: true },
  });

  if (!expense) {
    return NextResponse.json({ error: "Расход не найден" }, { status: 404 });
  }

  await archiveRecord(
    "expense",
    expense.id,
    `${expense.category.name} — ${expense.amount} сум`,
    expense,
    auth.session.userId,
  );

  await prisma.expense.delete({ where: { id } });

  await sendTelegramMessage(
    formatTelegramMessage(
      "удаление",
      "Расход",
      `📁 ${expense.category.name}\n💸 ${expense.amount} сум`,
      operatorFromSession(auth.session),
    ),
  );

  return NextResponse.json({ ok: true });
}
