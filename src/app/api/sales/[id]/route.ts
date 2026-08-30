import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  applySaleEffects,
  archiveRecord,
  enrichSaleDelivery,
  getSaleDebtPaid,
  reverseDebtPaymentsForSale,
  reverseSaleEffects,
  saleInclude,
} from "@/lib/finance";
import { describeChanges, logChange } from "@/lib/audit";
import { sendTelegramMessage, formatTelegramMessage, operatorFromSession } from "@/lib/telegram";
import { PAYMENT_TYPE_LABELS } from "@/lib/constants";

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

  const paid = await getSaleDebtPaid(sale.id);
  return NextResponse.json(
    enrichSaleDelivery({
      ...sale,
      debtPaid: paid,
      debtRemaining: sale.paymentType === "debt" ? Math.max(0, sale.totalPrice - paid) : 0,
    }),
  );
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const existing = await prisma.sale.findUnique({
    where: { id },
    include: { client: true, goodsDeliveries: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Продажа не найдена" }, { status: 404 });
  }

  const body = await request.json();
  const { quantity, pricePerUnit, totalPrice, notes, paymentType } = body;
  const payType =
    paymentType === "debt" || paymentType === "prepayment" ? paymentType : "paid";

  const newTotal = Number(totalPrice);
  const paid = await getSaleDebtPaid(id);
  if (payType === "debt" && paid > newTotal) {
    return NextResponse.json(
      { error: "Сумма меньше уже погашенного долга" },
      { status: 400 },
    );
  }

  const newQty = Number(quantity);
  if (payType === "prepayment") {
    const delivered = existing.goodsDeliveries.reduce((sum, item) => sum + item.quantity, 0);
    if (newQty < delivered) {
      return NextResponse.json(
        { error: `Нельзя уменьшить ниже уже выданного (${delivered} шт)` },
        { status: 400 },
      );
    }
  }

  const newData = {
    quantity: newQty,
    pricePerUnit: Number(pricePerUnit),
    totalPrice: newTotal,
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
    await reverseDebtPaymentsForSale(existing.id, existing.clientId);
  }

  await reverseSaleEffects(existing);

  const sale = await prisma.sale.update({
    where: { id },
    data: newData,
    include: saleInclude,
  });

  await applySaleEffects(sale);

  await sendTelegramMessage(
    formatTelegramMessage(
      "изменение",
      "Продажа шлакоблоков",
      `🚗 ${sale.client.carBrand} (${sale.client.licensePlate})\n` +
        `📦 ${sale.quantity} шт = ${sale.totalPrice} сум\n` +
        `💳 ${PAYMENT_TYPE_LABELS[payType]}`,
      operatorFromSession(auth.session),
    ),
  );

  const debtPaid = await getSaleDebtPaid(sale.id);
  return NextResponse.json(
    enrichSaleDelivery({
      ...sale,
      debtPaid,
      debtRemaining: sale.paymentType === "debt" ? Math.max(0, sale.totalPrice - debtPaid) : 0,
    }),
  );
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
  await reverseSaleEffects(sale);

  await archiveRecord(
    "sale",
    sale.id,
    `${sale.client.licensePlate} — ${sale.totalPrice} сум`,
    sale,
    auth.session.userId,
  );

  await prisma.sale.delete({ where: { id } });

  await sendTelegramMessage(
    formatTelegramMessage(
      "удаление",
      "Продажа шлакоблоков",
      `🚗 ${sale.client.carBrand} (${sale.client.licensePlate})\n` +
        `📦 ${sale.quantity} шт, ${sale.totalPrice} сум`,
      operatorFromSession(auth.session),
    ),
  );

  return NextResponse.json({ ok: true });
}
