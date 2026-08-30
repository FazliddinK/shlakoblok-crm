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

export async function getFinanceSummary() {
  const settings = await prisma.appSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { openingBalance: 0 },
  });

  const sales = await prisma.sale.findMany();
  const expenses = await prisma.expense.findMany();
  const clients = await prisma.client.findMany({
    orderBy: { balance: "desc" },
  });

  const cashIncome = sales.reduce((sum, sale) => {
    if (sale.paymentType === "paid" || sale.paymentType === "prepayment") {
      return sum + sale.totalPrice;
    }
    return sum;
  }, 0);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const cashBalance = settings.openingBalance + cashIncome - totalExpenses;

  const debtors = clients.filter((c) => c.balance > 0);
  const prepayments = clients.filter((c) => c.balance < 0);

  return {
    openingBalance: settings.openingBalance,
    cashIncome,
    totalExpenses,
    cashBalance,
    debtors,
    prepayments,
  };
}
