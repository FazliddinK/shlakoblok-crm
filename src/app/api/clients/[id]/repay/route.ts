import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { applyClientDebtRepayment } from "@/lib/finance";
import {
  formatTelegramMessage,
  operatorFromSession,
  sendTelegramMessage,
} from "@/lib/telegram";
import { formatCurrency } from "@/lib/labels";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) {
    return NextResponse.json({ error: "Клиент не найден" }, { status: 404 });
  }

  const body = await request.json();
  const amount = Number(body.amount);
  const note = body.note?.trim() ?? "";

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Укажите сумму погашения" }, { status: 400 });
  }

  try {
    const result = await applyClientDebtRepayment(
      id,
      amount,
      auth.session.userId,
      note,
    );

    await sendTelegramMessage(
      formatTelegramMessage(
        "создание",
        "Погашение долга клиента",
        `🚗 ${client.carBrand} (${client.licensePlate})\n` +
          `💵 ${formatCurrency(result.applied)}\n` +
          `📊 Баланс: ${formatCurrency(result.balance)}\n` +
          `📝 ${note || "—"}`,
        operatorFromSession(auth.session),
      ),
    );

    return NextResponse.json({
      ok: true,
      applied: result.applied,
      balance: result.balance,
      payments: result.payments,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ошибка погашения" },
      { status: 400 },
    );
  }
}
