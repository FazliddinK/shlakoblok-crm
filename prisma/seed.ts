import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash,
      displayName: "Администратор",
      role: "admin",
    },
  });

  await prisma.appSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { openingBalance: 500000 },
  });

  const client1 = await prisma.client.upsert({
    where: { licensePlate: "A123BC777" },
    update: {},
    create: {
      carBrand: "Toyota Camry",
      licensePlate: "A123BC777",
      phone: "+998 90 123-45-67",
      notes: "Постоянный клиент",
    },
  });

  const client2 = await prisma.client.upsert({
    where: { licensePlate: "B456KM750" },
    update: {},
    create: {
      carBrand: "GAZelle Next",
      licensePlate: "B456KM750",
      phone: "+998 91 444-55-66",
    },
  });

  const cat1 = await prisma.expenseCategory.upsert({
    where: { name: "Транспорт" },
    update: {},
    create: { name: "Транспорт" },
  });

  const cat2 = await prisma.expenseCategory.upsert({
    where: { name: "Зарплата" },
    update: {},
    create: { name: "Зарплата" },
  });

  const cp1 = await prisma.counterparty.create({
    data: { name: "ООО ТрансЛогистик", phone: "+998 71 200-00-00" },
  });

  await prisma.sale.createMany({
    data: [
      {
        clientId: client1.id,
        quantity: 500,
        pricePerUnit: 85000,
        totalPrice: 42500000,
        paidAmount: 42500000,
        paymentType: "paid",
        userId: admin.id,
        notes: "Самовывоз",
      },
      {
        clientId: client2.id,
        quantity: 1200,
        pricePerUnit: 82000,
        totalPrice: 98400000,
        paidAmount: 0,
        paymentType: "debt",
        userId: admin.id,
      },
    ],
  });

  const { recalculateAllClientBalances } = await import("../src/lib/finance");
  await recalculateAllClientBalances();

  await prisma.expense.create({
    data: {
      categoryId: cat1.id,
      counterpartyId: cp1.id,
      amount: 1500000,
      note: "Доставка блоков",
      userId: admin.id,
    },
  });

  console.log("Seed completed. Login: admin / admin123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
