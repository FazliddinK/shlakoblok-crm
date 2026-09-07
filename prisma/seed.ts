import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
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
    create: { openingBalance: 0 },
  });

  console.log("Seed completed. Login: admin / admin123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
