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

/** Денежный баланс: >0 клиент должен нам, <0 у клиента предоплата (переплата). */
export async function recalculateClientBalance(clientId: string): Promise<number> {
  const sales = await prisma.sale.findMany({
    where: { clientId },
    include: { debtPayments: true },
  });

  let balance = 0;
  for (const sale of sales) {
    const paidNow = sale.paidAmount ?? 0;
    balance += sale.totalPrice - paidNow;
    for (const payment of sale.debtPayments) {
      balance -= payment.amount;
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

export function derivePaymentType(params: {
  totalPrice: number;
  paidAmount: number;
  quantity: number;
  deliveredQuantity: number;
}): "paid" | "debt" | "prepayment" {
  const { totalPrice, paidAmount, quantity, deliveredQuantity } = params;
  if (paidAmount + 0.0001 < totalPrice) return "debt";
  if (deliveredQuantity < quantity) return "prepayment";
  return "paid";
}

/** @deprecated */
export async function reverseSaleEffects(sale: { clientId: string }) {
  await recalculateClientBalance(sale.clientId);
}

/** @deprecated */
export async function applySaleEffects(sale: { clientId: string }) {
  await recalculateClientBalance(sale.clientId);
}

export type SaleWithDeliveries = {
  id: string;
  quantity: number;
  totalPrice: number;
  paidAmount?: number;
  pricePerUnit: number;
  paymentType: string;
  createdAt?: Date | string;
  goodsDeliveries?: { quantity: number }[];
  debtPayments?: { amount: number }[];
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

export function getSaleMoneyDebt(sale: {
  totalPrice: number;
  paidAmount?: number;
  debtPayments?: { amount: number }[];
}): number {
  const paidAtSale = sale.paidAmount ?? 0;
  const repayments = sale.debtPayments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  return Math.max(0, sale.totalPrice - paidAtSale - repayments);
}

export function enrichSaleDelivery<T extends SaleWithDeliveries>(
  sale: T,
): T & {
  deliveredQuantity: number;
  remainingQuantity: number;
  paidAmount: number;
  debtRemaining: number;
  debtPaid: number;
  prepaymentRemainingAmount: number;
  totalQuantity: number;
  unitPrice: number;
  totalAmount: number;
} {
  const deliveredQuantity = getDeliveredQuantity(sale);
  const remaining =
    sale.paymentType === "prepayment"
      ? Math.max(0, sale.quantity - deliveredQuantity)
      : 0;

  const paidAtSale = sale.paidAmount ?? (sale.paymentType === "debt" ? 0 : sale.totalPrice);
  const repayments = sale.debtPayments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  const debtRemaining = Math.max(0, sale.totalPrice - paidAtSale - repayments);

  return {
    ...sale,
    totalQuantity: sale.quantity,
    unitPrice: sale.pricePerUnit,
    totalAmount: sale.totalPrice,
    deliveredQuantity,
    remainingQuantity: remaining,
    paidAmount: paidAtSale,
    debtPaid: repayments,
    debtRemaining,
    prepaymentRemainingAmount: remaining * sale.pricePerUnit,
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
  paidAmount?: number;
  paymentType: string;
}): Promise<number> {
  const paidAtSale = sale.paidAmount ?? (sale.paymentType === "debt" ? 0 : sale.totalPrice);
  const repayments = await getSaleDebtPaid(sale.id);
  return Math.max(0, sale.totalPrice - paidAtSale - repayments);
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

/** Погашение долга клиента (FIFO по продажам с остатком). */
export async function applyClientDebtRepayment(
  clientId: string,
  amount: number,
  userId: string,
  note = "",
) {
  if (amount <= 0) throw new Error("Сумма должна быть больше 0");

  const sales = await prisma.sale.findMany({
    where: { clientId },
    include: { debtPayments: true },
    orderBy: { createdAt: "asc" },
  });

  const openDebts = sales
    .map((sale) => ({
      sale,
      remaining: getSaleMoneyDebt(sale),
    }))
    .filter((item) => item.remaining > 0);

  const totalDebt = openDebts.reduce((sum, item) => sum + item.remaining, 0);
  if (totalDebt <= 0) {
    throw new Error("У клиента нет долга");
  }
  if (amount > totalDebt + 0.0001) {
    throw new Error(`Максимальная сумма погашения: ${totalDebt}`);
  }

  let left = amount;
  const created = [];
  for (const item of openDebts) {
    if (left <= 0) break;
    const pay = Math.min(left, item.remaining);
    const payment = await prisma.debtPayment.create({
      data: {
        saleId: item.sale.id,
        amount: pay,
        userId,
        note,
      },
    });
    created.push(payment);
    left -= pay;
  }

  const balance = await recalculateClientBalance(clientId);
  return { payments: created, balance, applied: amount - left };
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
      debtPayments: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const cashFromSales = sales.reduce((sum, sale) => sum + (sale.paidAmount ?? 0), 0);
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
      paidAmount: sale.paidAmount,
      prepaymentRemainingAmount: sale.prepaymentRemainingAmount,
      createdAt: sale.createdAt,
    }));

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
    pendingGoods: activePrepayments,
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
