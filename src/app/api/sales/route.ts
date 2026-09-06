import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  derivePaymentType,
  enrichSaleDelivery,
  recalculateClientBalance,
  saleInclude,
} from "@/lib/finance";
import { buildDateFilter, resolveSalesPeriod } from "@/lib/dates";
import {
  formatSaleTelegramMessage,
  formatTelegramMessage,
  operatorFromSession,
  sendTelegramMessage,
} from "@/lib/telegram";
import { formatCurrency } from "@/lib/labels";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const search = request.nextUrl.searchParams.get("search") ?? "";
  const period = request.nextUrl.searchParams.get("period") ?? "today";
  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");
  const pendingOnly = request.nextUrl.searchParams.get("pending") === "1";

  const { from, to, label } = resolveSalesPeriod(period, fromParam, toParam);

  const sales = await prisma.sale.findMany({
    where: {
      ...(pendingOnly ? {} : buildDateFilter(from, to)),
      ...(search
        ? {
            OR: [
              { client: { carBrand: { contains: search } } },
              { client: { licensePlate: { contains: search } } },
            ],
          }
        : {}),
    },
    include: saleInclude,
    orderBy: { createdAt: "desc" },
  });

  const enriched = sales
    .map((sale) => enrichSaleDelivery(sale))
    .filter((sale) => (pendingOnly ? sale.remainingQuantity > 0 : true));

  return NextResponse.json({ sales: enriched, period, from, to, periodLabel: label });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const {
    clientId,
    quantity,
    pricePerUnit,
    totalPrice,
    paidAmount,
    notes,
    carBrand,
    licensePlate,
    phone,
    initialDeliveryQuantity,
    initialDeliveryPlate,
  } = body;

  let resolvedClientId = clientId;
  const plate = licensePlate?.trim().toUpperCase();

  if (!resolvedClientId && plate) {
    const existing = await prisma.client.findUnique({
      where: { licensePlate: plate },
    });
    if (existing) {
      resolvedClientId = existing.id;
    } else if (carBrand?.trim()) {
      const newClient = await prisma.client.create({
        data: {
          carBrand: carBrand.trim(),
          licensePlate: plate,
          phone: phone?.trim() ?? "",
        },
      });
      resolvedClientId = newClient.id;

      await sendTelegramMessage(
        formatTelegramMessage(
          "создание",
          "Клиент (при продаже)",
          `🚗 Марка: ${newClient.carBrand}\n🔢 Гос. номер: ${newClient.licensePlate}`,
          operatorFromSession(auth.session),
        ),
      );
    }
  }

  if (!resolvedClientId) {
    return NextResponse.json({ error: "Укажите гос. номер авто" }, { status: 400 });
  }

  const qty = Number(quantity);
  const price = Number(pricePerUnit);
  const total = Number(totalPrice) || qty * price;
  const paid = Number(paidAmount);
  if (Number.isNaN(paid) || paid < 0) {
    return NextResponse.json({ error: "Укажите реально оплаченную сумму" }, { status: 400 });
  }

  if (!qty || qty <= 0 || !price || price <= 0) {
    return NextResponse.json({ error: "Укажите количество и цену" }, { status: 400 });
  }

  const client = await prisma.client.findUnique({ where: { id: resolvedClientId } });
  if (!client) {
    return NextResponse.json({ error: "Клиент не найден" }, { status: 404 });
  }

  let deliverNow = Number(initialDeliveryQuantity);
  if (Number.isNaN(deliverNow) || initialDeliveryQuantity === "" || initialDeliveryQuantity == null) {
    // По умолчанию: при полной/избыточной оплате можно выдать частями;
    // при недоплате (долг) — выдаём весь товар.
    deliverNow = paid + 0.0001 < total ? qty : qty;
  }

  if (deliverNow < 0 || deliverNow > qty) {
    return NextResponse.json(
      { error: "Количество выдачи должно быть от 0 до купленного" },
      { status: 400 },
    );
  }

  // Если клиент не доплатил — товар выдаём полностью (денежный долг)
  if (paid + 0.0001 < total) {
    deliverNow = qty;
  }

  const payType = derivePaymentType({
    totalPrice: total,
    paidAmount: paid,
    quantity: qty,
    deliveredQuantity: deliverNow,
  });

  const sale = await prisma.sale.create({
    data: {
      clientId: resolvedClientId,
      quantity: qty,
      pricePerUnit: price,
      totalPrice: total,
      paidAmount: paid,
      paymentType: payType,
      notes: notes?.trim() ?? "",
      userId: auth.session.userId,
    },
    include: saleInclude,
  });

  if (deliverNow > 0) {
    await prisma.goodsDelivery.create({
      data: {
        saleId: sale.id,
        quantity: deliverNow,
        licensePlate: (initialDeliveryPlate || client.licensePlate).trim().toUpperCase(),
        userId: auth.session.userId,
      },
    });
  }

  await recalculateClientBalance(resolvedClientId);

  const fullSale = await prisma.sale.findUnique({
    where: { id: sale.id },
    include: saleInclude,
  });

  const debt = Math.max(0, total - paid);
  const credit = Math.max(0, paid - total);

  await sendTelegramMessage(
    formatSaleTelegramMessage({
      carBrand: fullSale!.client.carBrand,
      licensePlate: fullSale!.client.licensePlate,
      quantity: fullSale!.quantity,
      pricePerUnit: fullSale!.pricePerUnit,
      totalPrice: fullSale!.totalPrice,
      paymentLabel:
        `Оплачено: ${formatCurrency(paid)}` +
        (debt > 0 ? `\nДолг: ${formatCurrency(debt)}` : "") +
        (credit > 0 ? `\nПереплата/предоплата: ${formatCurrency(credit)}` : "") +
        `\nВыдано: ${deliverNow} из ${qty} шт`,
      operator: operatorFromSession(auth.session),
    }),
  );

  return NextResponse.json(enrichSaleDelivery(fullSale!), { status: 201 });
}
