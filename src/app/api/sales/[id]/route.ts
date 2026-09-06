import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  archiveRecord,
  derivePaymentType,
  enrichSaleDelivery,
  recalculateClientBalance,
  reverseDebtPaymentsForSale,
  saleInclude,
} from "@/lib/finance";
import { describeChanges, logChange } from "@/lib/audit";
import { sendTelegramMessage, formatTelegramMessage, operatorFromSession } from "@/lib/telegram";
import { formatCurrency } from "@/lib/labels";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: saleInclude,
  });

  if (!sale) {
    return NextResponse.json({ error: "Продажа не найдена" }, { status: 404 });
  }

  return NextResponse.json(enrichSaleDelivery(sale));
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const existing = await prisma.sale.findUnique({
    where: { id },
    include: { client: true, goodsDeliveries: true, debtPayments: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Продажа не найдена" }, { status: 404 });
  }

  const body = await request.json();
  const { quantity, pricePerUnit, totalPrice, paidAmount, notes } = body;

  const newQty = Number(quantity);
  const newTotal = Number(totalPrice);
  const newPaid =
    paidAmount === undefined || paidAmount === null || paidAmount === ""
      ? existing.paidAmount
      : Number(paidAmount);

  if (Number.isNaN(newPaid) || newPaid < 0) {
    return NextResponse.json({ error: "Некорректная оплаченная сумма" }, { status: 400 });
  }

  const delivered = existing.goodsDeliveries.reduce((sum, item) => sum + item.quantity, 0);
  if (newQty < delivered) {
    return NextResponse.json(
      { error: `Нельзя уменьшить ниже уже выданного (${delivered} шт)` },
      { status: 400 },
    );
  }

  const repayments = existing.debtPayments.reduce((sum, p) => sum + p.amount, 0);
  if (newPaid + repayments > newTotal + 0.0001 && repayments > 0 && newPaid < existing.paidAmount) {
    // allow overpayment as credit; only block if reducing paid below already repaid nonsense
  }
  if (newTotal < repayments) {
    return NextResponse.json(
      { error: "Сумма продажи меньше уже погашенных платежей" },
      { status: 400 },
    );
  }

  const payType = derivePaymentType({
    totalPrice: newTotal,
    paidAmount: newPaid,
    quantity: newQty,
    deliveredQuantity: delivered,
  });

  const newData = {
    quantity: newQty,
    pricePerUnit: Number(pricePerUnit),
    totalPrice: newTotal,
    paidAmount: newPaid,
    paymentType: payType,
    notes: notes?.trim() ?? "",
  };

  await logChange(
    "sale",
    existing.id,
    `${existing.client.licensePlate} — ${describeChanges("sale", existing as never, newData)}`,
    existing,
    newData,
    auth.session.userId,
  );

  if (existing.paymentType === "debt" && payType !== "debt") {
    // keep repayments history; balance recalc handles it
  }

  const sale = await prisma.sale.update({
    where: { id },
    data: newData,
    include: saleInclude,
  });

  await recalculateClientBalance(existing.clientId);

  await sendTelegramMessage(
    formatTelegramMessage(
      "изменение",
      "Продажа шлакоблоков",
      `🚗 ${sale.client.carBrand} (${sale.client.licensePlate})\n` +
        `📦 ${sale.quantity} шт = ${formatCurrency(sale.totalPrice)}\n` +
        `💵 Оплачено: ${formatCurrency(sale.paidAmount)}`,
      operatorFromSession(auth.session),
    ),
  );

  return NextResponse.json(enrichSaleDelivery(sale));
}

export async function DELETE(_request: NextRequest, { params }: Params) {
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

  await reverseDebtPaymentsForSale(sale.id, sale.clientId);

  await archiveRecord(
    "sale",
    sale.id,
    `${sale.client.licensePlate} — ${sale.totalPrice} сум`,
    sale,
    auth.session.userId,
  );

  await prisma.sale.delete({ where: { id } });
  await recalculateClientBalance(sale.clientId);

  await sendTelegramMessage(
    formatTelegramMessage(
      "удаление",
      "Продажа шлакоблоков",
      `🚗 ${sale.client.carBrand} (${sale.client.licensePlate})\n` +
        `📦 ${sale.quantity} шт, ${formatCurrency(sale.totalPrice)}`,
      operatorFromSession(auth.session),
    ),
  );

  return NextResponse.json({ ok: true });
}
