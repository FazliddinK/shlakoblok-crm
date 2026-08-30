#!/bin/sh
set -e

mkdir -p /app/prisma/data
cd /app

echo "→ Применение миграций базы данных..."
npx prisma migrate deploy

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
