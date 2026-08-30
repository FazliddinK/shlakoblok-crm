import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { sendTelegramMessage, formatTelegramMessage, operatorFromSession } from "@/lib/telegram";

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
  const { clientId, quantity, pricePerUnit, totalPrice, notes, carBrand, licensePlate, phone } =
    body;

  let resolvedClientId = clientId;

  if (!resolvedClientId && carBrand && licensePlate) {
    const existing = await prisma.client.findFirst({
      where: { licensePlate: licensePlate.trim().toUpperCase() },
    });
    if (existing) {
      resolvedClientId = existing.id;
    } else {
      const newClient = await prisma.client.create({
        data: {
          carBrand: carBrand.trim(),
          licensePlate: licensePlate.trim().toUpperCase(),
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
    return NextResponse.json({ error: "Укажите клиента" }, { status: 400 });
  }

  const qty = Number(quantity);
  const price = Number(pricePerUnit);
  const total = Number(totalPrice) || qty * price;

  if (!qty || qty <= 0 || !price || price <= 0) {
    return NextResponse.json({ error: "Укажите количество и цену" }, { status: 400 });
  }

  const sale = await prisma.sale.create({
    data: {
      clientId: resolvedClientId,
      quantity: qty,
      pricePerUnit: price,
      totalPrice: total,
      notes: notes?.trim() ?? "",
      userId: auth.session.userId,
    },
    include: { client: true, user: { select: { displayName: true } } },
  });

  await sendTelegramMessage(
    formatTelegramMessage(
      "создание",
      "Продажа шлакоблоков",
      `🚗 ${sale.client.carBrand} (${sale.client.licensePlate})\n` +
        `📦 Количество: ${sale.quantity} шт\n` +
        `💰 Цена за шт: ${sale.pricePerUnit} ₽\n` +
        `💵 Итого: ${sale.totalPrice} ₽`,
      operatorFromSession(auth.session),
    ),
  );

  return NextResponse.json(sale, { status: 201 });
}
