import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { buildDateFilter, resolveReportPeriod } from "@/lib/dates";
import { getFinanceSummary } from "@/lib/finance";

function eachDateInclusive(from: string, to: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (cursor <= end) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const period = request.nextUrl.searchParams.get("period") ?? "last7";
  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");

  const { from, to, label } = resolveReportPeriod(period, fromParam, toParam);
  const dateFilter = buildDateFilter(from, to);

  const [finance, expenses, deliveries, legacySales] = await Promise.all([
    getFinanceSummary(),
    prisma.expense.findMany({
      where: dateFilter,
      orderBy: { createdAt: "asc" },
    }),
    prisma.goodsDelivery.findMany({
      where: dateFilter,
      include: { sale: { select: { pricePerUnit: true } } },
      orderBy: { createdAt: "asc" },
    }),
    // Fallback for old paid/debt sales that never got GoodsDelivery rows
    prisma.sale.findMany({
      where: {
        ...dateFilter,
        paymentType: { in: ["paid", "debt"] },
        goodsDeliveries: { none: {} },
      },
      select: {
        quantity: true,
        pricePerUnit: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const periodExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  type Issuance = { date: Date; quantity: number; amount: number };
  const issuances: Issuance[] = [];

  for (const delivery of deliveries) {
    issuances.push({
      date: delivery.createdAt,
      quantity: delivery.quantity,
      amount: delivery.quantity * delivery.sale.pricePerUnit,
    });
  }

  for (const sale of legacySales) {
    issuances.push({
      date: sale.createdAt,
      quantity: sale.quantity,
      amount: sale.quantity * sale.pricePerUnit,
    });
  }

  const soldQuantity = issuances.reduce((sum, item) => sum + item.quantity, 0);
  const soldAmount = issuances.reduce((sum, item) => sum + item.amount, 0);
  const avgPricePerUnit = soldQuantity > 0 ? soldAmount / soldQuantity : 0;

  const byDay: Record<string, { amount: number; quantity: number; count: number }> = {};
  for (const date of eachDateInclusive(from, to)) {
    byDay[date] = { amount: 0, quantity: 0, count: 0 };
  }
  for (const item of issuances) {
    const key = dayKey(item.date);
    if (!byDay[key]) byDay[key] = { amount: 0, quantity: 0, count: 0 };
    byDay[key].amount += item.amount;
    byDay[key].quantity += item.quantity;
    byDay[key].count += 1;
  }

  const dailySales = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stats]) => ({ date, ...stats }));

  return NextResponse.json({
    period,
    from,
    to,
    periodLabel: label,
    soldQuantity,
    soldAmount,
    avgPricePerUnit,
    dailySales,
    prepaymentsTotal: finance.activePrepaymentsTotal,
    debtTotal: finance.debtorsTotal,
    periodExpenses,
    cashBalance: finance.cashBalance,
  });
}
