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

export async function recalculateClientBalance(clientId: string): Promise<number> {
  const sales = await prisma.sale.findMany({
    where: { clientId },
    include: {
      debtPayments: true,
      goodsDeliveries: true,
    },
  });

  let balance = 0;

  for (const sale of sales) {
    if (sale.paymentType === "debt") {
      balance += sale.totalPrice;
      for (const payment of sale.debtPayments) {
        balance -= payment.amount;
      }
    } else if (sale.paymentType === "prepayment") {
      balance -= sale.totalPrice;
      for (const delivery of sale.goodsDeliveries) {
        balance += delivery.quantity * sale.pricePerUnit;
      }
    }
  }

  await prisma.client.update({
    where: { id: clientId },
    data: { balance },
  });

  return balance;
}

export async function recalculateAllClientBalances() {
  const clients = await prisma.client.findMany({ select: { id: true } });
  for (const client of clients) {
    await recalculateClientBalance(client.id);
  }
}

/** @deprecated use recalculateClientBalance after mutations */
export async function reverseSaleEffects(sale: {
  clientId: string;
  totalPrice: number;
  paymentType: string;
}) {
  await recalculateClientBalance(sale.clientId);
}

/** @deprecated use recalculateClientBalance after mutations */
export async function applySaleEffects(sale: {
  clientId: string;
  totalPrice: number;
  paymentType: string;
}) {
  await recalculateClientBalance(sale.clientId);
}

export type SaleWithDeliveries = {
  id: string;
  quantity: number;
  totalPrice: number;
  pricePerUnit: number;
  paymentType: string;
  createdAt?: Date | string;
  goodsDeliveries?: { quantity: number }[];
  client?: { carBrand: string; licensePlate: string; id?: string };
};

export function getDeliveredQuantity(sale: SaleWithDeliveries): number {
  const delivered =
    sale.goodsDeliveries?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  if (sale.paymentType === "prepayment") {
    return delivered;
  }

  if (sale.paymentType === "paid") {
    return delivered > 0 ? delivered : sale.quantity;
  }

  return sale.quantity;
}

export function enrichSaleDelivery<T extends SaleWithDeliveries>(
  sale: T,
): T & {
  deliveredQuantity: number;
  remainingQuantity: number;
  paidAmount: number;
  prepaymentRemainingAmount: number;
  totalQuantity: number;
  unitPrice: number;
  totalAmount: number;
} {
  const deliveredQuantity = getDeliveredQuantity(sale);
  const remainingQuantity =
    sale.paymentType === "prepayment"
      ? Math.max(0, sale.quantity - deliveredQuantity)
      : 0;
  const prepaymentRemainingAmount = remainingQuantity * sale.pricePerUnit;

  return {
    ...sale,
    totalQuantity: sale.quantity,
    unitPrice: sale.pricePerUnit,
    totalAmount: sale.totalPrice,
    deliveredQuantity,
    remainingQuantity,
    paidAmount: sale.totalPrice,
    prepaymentRemainingAmount,
  };
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
  await prisma.debtPayment.deleteMany({ where: { saleId } });
  await recalculateClientBalance(clientId);
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

  await recalculateClientBalance(clientId);
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

  const prepaymentSales = await prisma.sale.findMany({
    where: { paymentType: "prepayment" },
    include: {
      client: true,
      goodsDeliveries: true,
    },
    orderBy: { createdAt: "desc" },
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

  const debtors = clients
    .filter((c) => c.balance > 0)
    .map((c) => ({
      clientId: c.id,
      carBrand: c.carBrand,
      licensePlate: c.licensePlate,
      balance: c.balance,
    }));

  const activePrepayments = prepaymentSales
    .map((sale) => enrichSaleDelivery(sale))
    .filter((sale) => sale.remainingQuantity > 0)
    .map((sale) => ({
      saleId: sale.id,
      clientId: sale.client.id,
      carBrand: sale.client.carBrand,
      licensePlate: sale.client.licensePlate,
      purchasedQuantity: sale.quantity,
      deliveredQuantity: sale.deliveredQuantity,
      remainingQuantity: sale.remainingQuantity,
      pricePerUnit: sale.pricePerUnit,
      paidAmount: sale.totalPrice,
      prepaymentRemainingAmount: sale.prepaymentRemainingAmount,
      createdAt: sale.createdAt,
    }));

  const pendingGoods = activePrepayments;

  const prepaymentClients = clients.filter((c) => c.balance < 0);

  return {
    openingBalance: settings.openingBalance,
    cashIncome,
    cashFromSales,
    cashFromRepayments,
    totalExpenses,
    cashBalance,
    debtors,
    debtorsTotal: debtors.reduce((sum, d) => sum + d.balance, 0),
    prepayments: prepaymentClients,
    prepaymentsTotal: Math.abs(
      prepaymentClients.reduce((sum, c) => sum + c.balance, 0),
    ),
    activePrepayments,
    activePrepaymentsTotal: activePrepayments.reduce(
      (sum, item) => sum + item.prepaymentRemainingAmount,
      0,
    ),
    pendingGoods,
  };
}

export const saleInclude = {
  client: true,
  user: { select: { displayName: true } },
  debtPayments: {
    include: { user: { select: { displayName: true } } },
    orderBy: { createdAt: "desc" as const },
  },
  goodsDeliveries: {
    include: { user: { select: { displayName: true } } },
    orderBy: { createdAt: "desc" as const },
  },
};
