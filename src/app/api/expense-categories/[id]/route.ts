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
  const category = await prisma.expenseCategory.findUnique({ where: { id } });

  if (!category) {
    return NextResponse.json({ error: "Категория не найдена" }, { status: 404 });
  }

  await archiveRecord(
    "expense_category",
    category.id,
    category.name,
    category,
    auth.session.userId,
  );

  await prisma.expenseCategory.delete({ where: { id } });

  await sendTelegramMessage(
    formatTelegramMessage(
      "удаление",
      "Категория расходов",
      `📁 ${category.name}`,
      operatorFromSession(auth.session),
    ),
  );

  return NextResponse.json({ ok: true });
}
