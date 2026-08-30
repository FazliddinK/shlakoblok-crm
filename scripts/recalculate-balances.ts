import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function recalculateClientBalance(clientId: string): Promise<number> {
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
