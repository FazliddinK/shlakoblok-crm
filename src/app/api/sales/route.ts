import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { applySaleEffects, archiveRecord, reverseSaleEffects } from "@/lib/finance";
import { sendTelegramMessage, formatTelegramMessage, operatorFromSession } from "@/lib/telegram";
import { PAYMENT_TYPE_LABELS } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const search = request.nextUrl.searchParams.get("search") ?? "";
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  const dateFilter =
    from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to + "T23:59:59") } : {}),
          },
        }
      : {};

  const sales = await prisma.sale.findMany({
    where: {
      ...dateFilter,
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
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(sales);
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
    include: { client: true, user: { select: { displayName: true } } },
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

  return NextResponse.json(sale, { status: 201 });
}
