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

  const client1 = await prisma.client.upsert({
    where: { id: "seed-client-1" },
    update: {},
    create: {
      id: "seed-client-1",
      carBrand: "Toyota Camry",
      licensePlate: "А123БВ777",
      phone: "+7 (999) 111-22-33",
      notes: "Постоянный клиент",
    },
  });

  const client2 = await prisma.client.create({
    data: {
      carBrand: "GAZelle Next",
      licensePlate: "В456КМ750",
      phone: "+7 (916) 444-55-66",
    },
  });

  await prisma.sale.createMany({
    data: [
      {
        clientId: client1.id,
        quantity: 500,
        pricePerUnit: 85,
        totalPrice: 42500,
        userId: admin.id,
        notes: "Самовывоз",
      },
      {
        clientId: client2.id,
        quantity: 1200,
        pricePerUnit: 82,
        totalPrice: 98400,
        userId: admin.id,
      },
    ],
  });

  console.log("Seed completed. Login: admin / admin123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
