#!/bin/sh
set -e

mkdir -p /app/prisma/data
cd /app

echo "→ Применение миграций базы данных..."
npx prisma migrate deploy

echo "→ Пересчёт балансов клиентов..."
node <<'EOF'
const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    const clients = await prisma.client.findMany({ select: { id: true } });
    for (const client of clients) {
      const sales = await prisma.sale.findMany({
        where: { clientId: client.id },
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
        where: { id: client.id },
        data: { balance },
      });
    }
    console.log(`Recalculated balances for ${clients.length} clients`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
EOF

echo "→ Проверка начальных данных..."
node <<'EOF'
const { PrismaClient } = require("@prisma/client");
const { execSync } = require("child_process");

async function main() {
  const prisma = new PrismaClient();
  try {
    const count = await prisma.user.count();
    if (count === 0) {
      console.log("→ База пустая, загрузка демо-данных...");
      execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
EOF

echo "→ Запуск SHLAKOBLOK CRM на порту 43123..."
exec npm start
