import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { buildDateFilter, resolveReportPeriod } from "@/lib/dates";
import { enrichSaleDelivery, getFinanceSummary } from "@/lib/finance";

function periodCashFromSale(sale: { paymentType: string; totalPrice: number }) {
  if (sale.paymentType === "paid" || sale.paymentType === "prepayment") {
    return sale.totalPrice;
  }
  return 0;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const period = request.nextUrl.searchParams.get("period") ?? "month";
  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");

  const { from, to, label } = resolveReportPeriod(period, fromParam, toParam);
  const dateFilter = buildDateFilter(from, to);

  const [
    finance,
    sales,
    expenses,
    debtPayments,
    prepaymentSales,
    debtSalesAll,
  ] = await Promise.all([
    getFinanceSummary(),
    prisma.sale.findMany({
      where: dateFilter,
      include: { client: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.expense.findMany({
      where: dateFilter,
      include: { category: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.debtPayment.findMany({
      where: dateFilter,
      include: {
        sale: { include: { client: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.sale.findMany({
      where: { paymentType: "prepayment" },
      include: { client: true, goodsDeliveries: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.sale.findMany({
      where: { paymentType: "debt" },
      include: {
        client: true,
        debtPayments: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const periodSalesCash = sales.reduce((sum, sale) => sum + periodCashFromSale(sale), 0);
  const periodRepayments = debtPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const periodIncome = periodSalesCash + periodRepayments;
  const periodExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const netCashResult = periodIncome - periodExpenses;

  const totalQuantity = sales.reduce((sum, sale) => sum + sale.quantity, 0);
  const avgCheck = sales.length ? periodIncome / sales.length : 0;

  const paidSalesCount = sales.filter((sale) => sale.paymentType === "paid").length;
  const prepaymentSalesCount = sales.filter((sale) => sale.paymentType === "prepayment").length;
  const debtSalesCount = sales.filter((sale) => sale.paymentType === "debt").length;
  const periodPrepaymentsReceived = sales
    .filter((sale) => sale.paymentType === "prepayment")
    .reduce((sum, sale) => sum + sale.totalPrice, 0);

  const byDay: Record<string, { revenue: number; expenses: number; quantity: number; count: number }> = {};

  for (const sale of sales) {
    const key = sale.createdAt.toISOString().slice(0, 10);
    if (!byDay[key]) byDay[key] = { revenue: 0, expenses: 0, quantity: 0, count: 0 };
    byDay[key].revenue += periodCashFromSale(sale);
    byDay[key].quantity += sale.quantity;
    byDay[key].count += 1;
  }

  for (const payment of debtPayments) {
    const key = payment.createdAt.toISOString().slice(0, 10);
    if (!byDay[key]) byDay[key] = { revenue: 0, expenses: 0, quantity: 0, count: 0 };
    byDay[key].revenue += payment.amount;
  }

  for (const expense of expenses) {
    const key = expense.createdAt.toISOString().slice(0, 10);
    if (!byDay[key]) byDay[key] = { revenue: 0, expenses: 0, quantity: 0, count: 0 };
    byDay[key].expenses += expense.amount;
  }

  const dailyStats = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stats]) => ({ date, ...stats }));

  const expensesByCategory: Record<string, number> = {};
  for (const expense of expenses) {
    expensesByCategory[expense.category.name] =
      (expensesByCategory[expense.category.name] ?? 0) + expense.amount;
  }

  const categoryStats = Object.entries(expensesByCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([category, amount]) => ({ category, amount }));

  const debtorDetails = await Promise.all(
    finance.debtors.map(async (debtor) => {
      const clientDebtSales = debtSalesAll.filter((sale) => sale.clientId === debtor.clientId);
      const oldestDebt = clientDebtSales[0];
      const allPayments = clientDebtSales.flatMap((sale) => sale.debtPayments);
      const lastPayment = allPayments.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      )[0];

      return {
        ...debtor,
        debtSince: oldestDebt?.createdAt ?? null,
        lastPaymentAt: lastPayment?.createdAt ?? null,
        lastPaymentAmount: lastPayment?.amount ?? 0,
      };
    }),
  );

  const activePrepayments = prepaymentSales
    .map((sale) => enrichSaleDelivery(sale))
    .filter((sale) => sale.remainingQuantity > 0)
    .map((sale) => ({
      saleId: sale.id,
      clientId: sale.client!.id,
      carBrand: sale.client!.carBrand,
      licensePlate: sale.client!.licensePlate,
      purchasedQuantity: sale.quantity,
      deliveredQuantity: sale.deliveredQuantity,
      remainingQuantity: sale.remainingQuantity,
      pricePerUnit: sale.pricePerUnit,
      prepaymentRemainingAmount: sale.prepaymentRemainingAmount,
      paidAmount: sale.totalPrice,
      createdAt: sale.createdAt,
    }));

  const activeGoodsCount = activePrepayments.length;
  const activeGoodsBlocks = activePrepayments.reduce(
    (sum, item) => sum + item.remainingQuantity,
    0,
  );

  return NextResponse.json({
    period,
    from,
    to,
    periodLabel: label,
    cash: {
      openingBalance: finance.openingBalance,
      cashIncome: finance.cashIncome,
      totalExpensesAllTime: finance.totalExpenses,
      cashBalance: finance.cashBalance,
      periodIncome,
      periodSalesCash,
      periodRepayments,
      periodExpenses,
      netCashResult,
    },
    sales: {
      count: sales.length,
      totalQuantity,
      totalRevenue: periodIncome,
      avgCheck,
      paidCount: paidSalesCount,
      prepaymentCount: prepaymentSalesCount,
      debtCount: debtSalesCount,
      prepaymentsReceived: periodPrepaymentsReceived,
      repaymentsTotal: periodRepayments,
    },
    debtors: {
      count: finance.debtors.length,
      total: finance.debtorsTotal,
      items: debtorDetails,
    },
    prepayments: {
      count: activePrepayments.length,
      total: activePrepayments.reduce((sum, item) => sum + item.prepaymentRemainingAmount, 0),
      items: activePrepayments,
    },
    goodsPending: {
      clients: activeGoodsCount,
      blocks: activeGoodsBlocks,
    },
    dailyStats,
    categoryStats,
    recentSales: sales.slice(0, 10),
  });
}
