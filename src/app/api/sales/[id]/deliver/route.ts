import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  enrichSaleDelivery,
  getFinanceSummary,
  getSaleDebtPaid,
  recalculateClientBalance,
  saleInclude,
} from "@/lib/finance";
import { logChange } from "@/lib/audit";
import {
  formatDeliveryTelegramMessage,
  operatorFromSession,
  sendTelegramMessage,
} from "@/lib/telegram";

type Params = { params: Promise<{ id: string }> };

async function notifyDelivery(
  sale: {
    client: { carBrand: string; licensePlate: string };
    quantity: number;
    pricePerUnit: number;
  },
  deliveredNow: number,
  enriched: ReturnType<typeof enrichSaleDelivery>,
  operator: ReturnType<typeof operatorFromSession>,
) {
  await sendTelegramMessage(
    formatDeliveryTelegramMessage({
      carBrand: sale.client.carBrand,
      licensePlate: sale.client.licensePlate,
      deliveredNow,
      totalPurchased: sale.quantity,
      totalDelivered: enriched.deliveredQuantity,
      remaining: enriched.remainingQuantity,
      prepaymentRemaining: enriched.prepaymentRemainingAmount,
      operator,
      fullyClosed: enriched.remainingQuantity === 0,
    }),
  );
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: { client: true, goodsDeliveries: true },
  });

  if (!sale) {
    return NextResponse.json({ error: "Продажа не найдена" }, { status: 404 });
  }

  if (sale.paymentType !== "prepayment") {
    return NextResponse.json(
      { error: "Частичная выдача доступна только для предоплаты" },
      { status: 400 },
    );
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

  const delivered = sale.goodsDeliveries.reduce((sum, item) => sum + item.quantity, 0);
  const remaining = Math.max(0, sale.quantity - delivered);

  if (quantity > remaining) {
    return NextResponse.json(
      { error: `Можно выдать не более ${remaining} шт` },
      { status: 400 },
    );
  }

  const delivery = await prisma.goodsDelivery.create({
    data: {
      saleId: sale.id,
      quantity,
      licensePlate,
      note,
      userId: auth.session.userId,
    },
    include: { user: { select: { displayName: true } } },
  });

  await recalculateClientBalance(sale.clientId);

  await logChange(
    "goods_delivery",
    delivery.id,
    `${sale.client.licensePlate}: выдача ${quantity} шт`,
    {},
    delivery,
    auth.session.userId,
  );

  const updated = await prisma.sale.findUnique({
    where: { id },
    include: saleInclude,
  });

  const enriched = enrichSaleDelivery(updated!);
  const operator = operatorFromSession(auth.session);

  await notifyDelivery(sale, quantity, enriched, operator);

  const paid = await getSaleDebtPaid(id);
  return NextResponse.json({
    ...enriched,
    debtPaid: paid,
    debtRemaining: 0,
  });
}
