import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  enrichSaleDelivery,
  getSaleDebtPaid,
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
import { PAYMENT_TYPE_LABELS } from "@/lib/constants";

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
    .map((sale) => {
      const paid = sale.debtPayments.reduce((sum, p) => sum + p.amount, 0);
      const debtRemaining =
        sale.paymentType === "debt" ? Math.max(0, sale.totalPrice - paid) : 0;
      return enrichSaleDelivery({
        ...sale,
        debtPaid: paid,
        debtRemaining,
      });
    })
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
    notes,
    carBrand,
    licensePlate,
    phone,
    paymentType,
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
  const payType = paymentType === "debt" || paymentType === "prepayment" ? paymentType : "paid";

  if (!qty || qty <= 0 || !price || price <= 0) {
    return NextResponse.json({ error: "Укажите количество и цену" }, { status: 400 });
  }

  const client = await prisma.client.findUnique({ where: { id: resolvedClientId } });
  if (!client) {
    return NextResponse.json({ error: "Клиент не найден" }, { status: 404 });
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
    include: saleInclude,
  });

  if (payType === "paid") {
    await prisma.goodsDelivery.create({
      data: {
        saleId: sale.id,
        quantity: qty,
        licensePlate: client.licensePlate,
        userId: auth.session.userId,
      },
    });
  } else if (payType === "prepayment") {
    const initialQty = Number(initialDeliveryQuantity) || 0;
    if (initialQty > 0) {
      if (initialQty > qty) {
        return NextResponse.json(
          { error: "Нельзя выдать больше, чем куплено" },
          { status: 400 },
        );
      }
      await prisma.goodsDelivery.create({
        data: {
          saleId: sale.id,
          quantity: initialQty,
          licensePlate: (initialDeliveryPlate || client.licensePlate).trim().toUpperCase(),
          userId: auth.session.userId,
        },
      });
    }
  }

  await recalculateClientBalance(resolvedClientId);

  const fullSale = await prisma.sale.findUnique({
    where: { id: sale.id },
    include: saleInclude,
  });

  await sendTelegramMessage(
    formatSaleTelegramMessage({
      carBrand: fullSale!.client.carBrand,
      licensePlate: fullSale!.client.licensePlate,
      quantity: fullSale!.quantity,
      pricePerUnit: fullSale!.pricePerUnit,
      totalPrice: fullSale!.totalPrice,
      paymentLabel: PAYMENT_TYPE_LABELS[payType],
      operator: operatorFromSession(auth.session),
    }),
  );

  const paid = await getSaleDebtPaid(sale.id);
  const result = enrichSaleDelivery({
    ...fullSale!,
    debtPaid: paid,
    debtRemaining: payType === "debt" ? total : 0,
  });

  return NextResponse.json(result, { status: 201 });
}
