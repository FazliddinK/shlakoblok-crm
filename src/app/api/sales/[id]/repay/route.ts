import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  applyDebtPayment,
  getSaleDebtRemaining,
} from "@/lib/finance";
import { sendTelegramMessage, formatTelegramMessage, operatorFromSession } from "@/lib/telegram";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: { client: true },
  });

  if (!sale) {
    return NextResponse.json({ error: "Продажа не найдена" }, { status: 404 });
  }

  if (sale.paymentType !== "debt") {
    return NextResponse.json({ error: "Эта продажа не в долг" }, { status: 400 });
  }

  const remaining = await getSaleDebtRemaining(sale);
  if (remaining <= 0) {
    return NextResponse.json({ error: "Долг по этой продаже уже погашен" }, { status: 400 });
  }

  const body = await request.json();
  const amount = Number(body.amount);
  const note = body.note?.trim() ?? "";

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Укажите сумму погашения" }, { status: 400 });
  }

  if (amount > remaining) {
    return NextResponse.json(
      { error: `Максимальная сумма: ${remaining} сум` },
      { status: 400 },
    );
  }

  await applyDebtPayment(sale.id, sale.clientId, amount, auth.session.userId, note);

  const updated = await prisma.sale.findUnique({
    where: { id },
    include: {
      client: true,
      user: { select: { displayName: true } },
      debtPayments: {
        include: { user: { select: { displayName: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  await sendTelegramMessage(
    formatTelegramMessage(
      "создание",
      "Погашение долга",
      `🚗 ${sale.client.carBrand} (${sale.client.licensePlate})\n` +
        `💵 ${amount} сум\n` +
        `📝 ${note || "—"}`,
      operatorFromSession(auth.session),
    ),
  );

  const debtPaid = updated!.debtPayments.reduce((s, p) => s + p.amount, 0);
  const debtRemaining =
    updated!.paymentType === "debt"
      ? Math.max(0, updated!.totalPrice - debtPaid)
      : 0;

  return NextResponse.json({ ...updated, debtPaid, debtRemaining });
}
