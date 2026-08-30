import { prisma } from "@/lib/db";
import type { EntityType } from "@/lib/constants";

export async function archiveRecord(
  entityType: EntityType,
  entityId: string,
  label: string,
  data: unknown,
  deletedById: string,
) {
  await prisma.deletedRecord.create({
    data: {
      entityType,
      entityId,
      label,
      data: JSON.stringify(data),
      deletedById,
    },
  });
}

export async function reverseSaleEffects(sale: {
  clientId: string;
  totalPrice: number;
  paymentType: string;
}) {
  if (sale.paymentType === "debt") {
    await prisma.client.update({
      where: { id: sale.clientId },
      data: { balance: { decrement: sale.totalPrice } },
    });
  } else if (sale.paymentType === "prepayment") {
    await prisma.client.update({
      where: { id: sale.clientId },
      data: { balance: { increment: sale.totalPrice } },
    });
  }
}

export async function applySaleEffects(sale: {
  clientId: string;
  totalPrice: number;
  paymentType: string;
}) {
  if (sale.paymentType === "debt") {
    await prisma.client.update({
      where: { id: sale.clientId },
      data: { balance: { increment: sale.totalPrice } },
    });
  } else if (sale.paymentType === "prepayment") {
    await prisma.client.update({
      where: { id: sale.clientId },
      data: { balance: { decrement: sale.totalPrice } },
    });
  }
}

export async function getSaleDebtPaid(saleId: string): Promise<number> {
  const payments = await prisma.debtPayment.aggregate({
    where: { saleId },
    _sum: { amount: true },
  });
  return payments._sum.amount ?? 0;
}

export async function getSaleDebtRemaining(sale: {
  id: string;
  totalPrice: number;
  paymentType: string;
}): Promise<number> {
  if (sale.paymentType !== "debt") return 0;
  const paid = await getSaleDebtPaid(sale.id);
  return Math.max(0, sale.totalPrice - paid);
}

export async function reverseDebtPaymentsForSale(saleId: string, clientId: string) {
  const payments = await prisma.debtPayment.findMany({ where: { saleId } });
  for (const payment of payments) {
    await prisma.client.update({
      where: { id: clientId },
      data: { balance: { increment: payment.amount } },
    });
  }
  await prisma.debtPayment.deleteMany({ where: { saleId } });
}

export async function applyDebtPayment(
  saleId: string,
  clientId: string,
  amount: number,
  userId: string,
  note = "",
) {
  const payment = await prisma.debtPayment.create({
    data: { saleId, amount, userId, note },
  });

  await prisma.client.update({
    where: { id: clientId },
    data: { balance: { decrement: amount } },
  });

  return payment;
}

export async function getFinanceSummary() {
  const settings = await prisma.appSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { openingBalance: 0 },
  });

  const sales = await prisma.sale.findMany();
  const expenses = await prisma.expense.findMany();
  const debtPayments = await prisma.debtPayment.findMany();
  const clients = await prisma.client.findMany({
    orderBy: { balance: "desc" },
  });

  const cashFromSales = sales.reduce((sum, sale) => {
    if (sale.paymentType === "paid" || sale.paymentType === "prepayment") {
      return sum + sale.totalPrice;
    }
    return sum;
  }, 0);

  const cashFromRepayments = debtPayments.reduce((sum, p) => sum + p.amount, 0);
  const cashIncome = cashFromSales + cashFromRepayments;

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const cashBalance = settings.openingBalance + cashIncome - totalExpenses;

  const debtors = clients.filter((c) => c.balance > 0);
  const prepayments = clients.filter((c) => c.balance < 0);

  return {
    openingBalance: settings.openingBalance,
    cashIncome,
    cashFromSales,
    cashFromRepayments,
    totalExpenses,
    cashBalance,
    debtors,
    prepayments,
  };
}
