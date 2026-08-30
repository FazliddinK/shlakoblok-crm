import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { archiveRecord, enrichSaleDelivery, getSaleDebtPaid, saleInclude } from "@/lib/finance";
import { logChange } from "@/lib/audit";
import { sendTelegramMessage, formatTelegramMessage, operatorFromSession } from "@/lib/telegram";

type Params = { params: Promise<{ id: string; deliveryId: string }> };

async function getDeliveryContext(deliveryId: string) {
  const delivery = await prisma.goodsDelivery.findUnique({
    where: { id: deliveryId },
    include: {
      sale: { include: { client: true, goodsDeliveries: true } },
      user: { select: { displayName: true } },
    },
  });
  return delivery;
}

function getRemainingForSale(sale: { quantity: number; goodsDeliveries: { id: string; quantity: number }[] }, excludeId?: string) {
  const delivered = sale.goodsDeliveries
    .filter((item) => item.id !== excludeId)
    .reduce((sum, item) => sum + item.quantity, 0);
  return Math.max(0, sale.quantity - delivered);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { deliveryId } = await params;
  const delivery = await getDeliveryContext(deliveryId);
  if (!delivery) {
    return NextResponse.json({ error: "Выдача не найдена" }, { status: 404 });
  }

  const body = await request.json();
  const quantity = Number(body.quantity);
  const licensePlate = body.licensePlate?.trim().toUpperCase();
  const note = body.note?.trim() ?? "";

  if (!quantity || quantity <= 0) {
    return NextResponse.json({ error: "Укажите количество" }, { status: 400 });
  }

  if (!licensePlate) {
    return NextResponse.json({ error: "Укажите гос. номер" }, { status: 400 });
  }

  const remaining = getRemainingForSale(delivery.sale, delivery.id);
  if (quantity > remaining) {
    return NextResponse.json(
      { error: `Можно выдать не более ${remaining} шт` },
      { status: 400 },
    );
  }

  const newData = { quantity, licensePlate, note };
  await logChange(
    "goods_delivery",
    delivery.id,
    `${delivery.sale.client.licensePlate}: ${delivery.quantity} → ${quantity} шт`,
    delivery,
    newData,
    auth.session.userId,
  );

  await prisma.goodsDelivery.update({
    where: { id: delivery.id },
    data: newData,
  });

  await sendTelegramMessage(
    formatTelegramMessage(
      "изменение",
      "Исправление выдачи",
      `🚗 ${delivery.sale.client.licensePlate}\n📦 ${delivery.quantity} → ${quantity} шт`,
      operatorFromSession(auth.session),
    ),
  );

  const updated = await prisma.sale.findUnique({
    where: { id: delivery.saleId },
    include: saleInclude,
  });

  const paid = await getSaleDebtPaid(delivery.saleId);
  return NextResponse.json(
    enrichSaleDelivery({ ...updated!, debtPaid: paid, debtRemaining: 0 }),
  );
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { deliveryId } = await params;
  const delivery = await getDeliveryContext(deliveryId);
  if (!delivery) {
    return NextResponse.json({ error: "Выдача не найдена" }, { status: 404 });
  }

  await archiveRecord(
    "goods_delivery",
    delivery.id,
    `${delivery.sale.client.licensePlate} — ${delivery.quantity} шт`,
    delivery,
    auth.session.userId,
  );

  await prisma.goodsDelivery.delete({ where: { id: delivery.id } });

  await sendTelegramMessage(
    formatTelegramMessage(
      "удаление",
      "Удаление выдачи",
      `🚗 ${delivery.sale.client.licensePlate}\n📦 ${delivery.quantity} шт`,
      operatorFromSession(auth.session),
    ),
  );

  const updated = await prisma.sale.findUnique({
    where: { id: delivery.saleId },
    include: saleInclude,
  });

  const paid = await getSaleDebtPaid(delivery.saleId);
  return NextResponse.json(
    enrichSaleDelivery({ ...updated!, debtPaid: paid, debtRemaining: 0 }),
  );
}
