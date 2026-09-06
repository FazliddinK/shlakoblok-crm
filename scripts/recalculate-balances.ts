import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Денежный баланс: >0 клиент должен нам, <0 у клиента предоплата (переплата). */
async function recalculateClientBalance(clientId: string): Promise<number> {
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

async function main() {
  const clients = await prisma.client.findMany({ select: { id: true } });
  for (const client of clients) {
    await recalculateClientBalance(client.id);
  }
  console.log(`Recalculated balances for ${clients.length} clients`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
