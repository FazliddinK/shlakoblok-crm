import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { applySaleEffects } from "@/lib/finance";
import { buildDateFilter, resolveDateRange } from "@/lib/dates";
import { sendTelegramMessage, formatTelegramMessage, operatorFromSession } from "@/lib/telegram";
import { PAYMENT_TYPE_LABELS } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const search = request.nextUrl.searchParams.get("search") ?? "";
  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");
  const allTime = request.nextUrl.searchParams.get("all") === "1";

  const { from, to } = allTime
    ? { from: fromParam, to: toParam }
    : resolveDateRange(fromParam, toParam, true);

  const sales = await prisma.sale.findMany({
    where: {
      ...buildDateFilter(from, to),
      ...(search
        ? {
            OR: [
              { client: { carBrand: { contains: search } } },
              { client: { licensePlate: { contains: search } } },
            ],
          }
        : {}),
    },
    include: {
      client: true,
      user: { select: { displayName: true } },
      debtPayments: {
        include: { user: { select: { displayName: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const enriched = sales.map((sale) => {
    const paid = sale.debtPayments.reduce((sum, p) => sum + p.amount, 0);
    const debtRemaining =
      sale.paymentType === "debt" ? Math.max(0, sale.totalPrice - paid) : 0;
    return { ...sale, debtPaid: paid, debtRemaining };
  });

  return NextResponse.json(enriched);
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
    notes,
    carBrand,
    licensePlate,
    phone,
    paymentType,
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
  const payType = paymentType === "debt" || paymentType === "prepayment" ? paymentType : "paid";

  if (!qty || qty <= 0 || !price || price <= 0) {
    return NextResponse.json({ error: "Укажите количество и цену" }, { status: 400 });
  }

  const sale = await prisma.sale.create({
    data: {
      clientId: resolvedClientId,
      quantity: qty,
      pricePerUnit: price,
      totalPrice: total,
      paymentType: payType,
      notes: notes?.trim() ?? "",
      userId: auth.session.userId,
    },
    include: {
      client: true,
      user: { select: { displayName: true } },
      debtPayments: true,
    },
  });

  await applySaleEffects(sale);

  await sendTelegramMessage(
    formatTelegramMessage(
      "создание",
      "Продажа шлакоблоков",
      `🚗 ${sale.client.carBrand} (${sale.client.licensePlate})\n` +
        `📦 ${sale.quantity} шт × ${sale.pricePerUnit} сум\n` +
        `💵 Итого: ${sale.totalPrice} сум\n` +
        `💳 ${PAYMENT_TYPE_LABELS[payType]}`,
      operatorFromSession(auth.session),
    ),
  );

  return NextResponse.json(
    { ...sale, debtPaid: 0, debtRemaining: payType === "debt" ? total : 0 },
    { status: 201 },
  );
}
