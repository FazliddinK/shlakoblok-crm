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
  const counterparty = await prisma.counterparty.findUnique({ where: { id } });

  if (!counterparty) {
    return NextResponse.json({ error: "Контрагент не найден" }, { status: 404 });
  }

  await archiveRecord(
    "counterparty",
    counterparty.id,
    counterparty.name,
    counterparty,
    auth.session.userId,
  );

  await prisma.counterparty.delete({ where: { id } });

  await sendTelegramMessage(
    formatTelegramMessage(
      "удаление",
      "Контрагент",
      `🏢 ${counterparty.name}`,
      operatorFromSession(auth.session),
    ),
  );

  return NextResponse.json({ ok: true });
}
