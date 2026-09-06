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

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const period = request.nextUrl.searchParams.get("period") ?? "last7";
  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");

  const { from, to, label } = resolveReportPeriod(period, fromParam, toParam);
  const dateFilter = buildDateFilter(from, to);

  const [finance, sales, expenses] = await Promise.all([
    getFinanceSummary(),
    prisma.sale.findMany({
      where: dateFilter,
      include: { client: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.expense.findMany({
      where: dateFilter,
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const soldQuantity = sales.reduce((sum, sale) => sum + sale.quantity, 0);
  const soldAmount = sales.reduce((sum, sale) => sum + sale.totalPrice, 0);
  const avgPricePerUnit = soldQuantity > 0 ? soldAmount / soldQuantity : 0;
  const periodExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  const byDay: Record<string, { amount: number; quantity: number; count: number }> = {};
  for (const date of eachDateInclusive(from, to)) {
    byDay[date] = { amount: 0, quantity: 0, count: 0 };
  }
  for (const sale of sales) {
    const key = sale.createdAt.toISOString().slice(0, 10);
    if (!byDay[key]) byDay[key] = { amount: 0, quantity: 0, count: 0 };
    byDay[key].amount += sale.totalPrice;
    byDay[key].quantity += sale.quantity;
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
    prepaymentsTotal: finance.prepaymentsTotal,
    debtTotal: finance.debtorsTotal,
    periodExpenses,
    cashBalance: finance.cashBalance,
  });
}
