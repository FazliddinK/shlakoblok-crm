import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  applySaleEffects,
  archiveRecord,
  reverseSaleEffects,
} from "@/lib/finance";
import { sendTelegramMessage, formatTelegramMessage, operatorFromSession } from "@/lib/telegram";
import { PAYMENT_TYPE_LABELS } from "@/lib/constants";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: { client: true, user: { select: { displayName: true } } },
  });

  if (!sale) {
    return NextResponse.json({ error: "Продажа не найдена" }, { status: 404 });
  }

  return NextResponse.json(sale);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const existing = await prisma.sale.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Продажа не найдена" }, { status: 404 });
  }

  const body = await request.json();
  const { quantity, pricePerUnit, totalPrice, notes, paymentType } = body;
  const payType =
    paymentType === "debt" || paymentType === "prepayment" ? paymentType : "paid";

  await reverseSaleEffects(existing);

  const sale = await prisma.sale.update({
    where: { id },
    data: {
      quantity: Number(quantity),
      pricePerUnit: Number(pricePerUnit),
      totalPrice: Number(totalPrice),
      paymentType: payType,
      notes: notes?.trim() ?? "",
    },
    include: { client: true, user: { select: { displayName: true } } },
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

  return NextResponse.json(sale);
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
