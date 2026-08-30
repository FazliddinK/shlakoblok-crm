import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { sendTelegramMessage, formatTelegramMessage, operatorFromSession } from "@/lib/telegram";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const search = request.nextUrl.searchParams.get("search") ?? "";

  const clients = await prisma.client.findMany({
    where: search
      ? {
          OR: [
            { carBrand: { contains: search } },
            { licensePlate: { contains: search } },
            { phone: { contains: search } },
          ],
        }
      : undefined,
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { sales: true } } },
  });

  return NextResponse.json(clients);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { carBrand, licensePlate, phone, notes } = body;

  if (!carBrand?.trim() || !licensePlate?.trim()) {
    return NextResponse.json(
      { error: "Марка авто и гос. номер обязательны" },
      { status: 400 },
    );
  }

  const client = await prisma.client.create({
    data: {
      carBrand: carBrand.trim(),
      licensePlate: licensePlate.trim().toUpperCase(),
      phone: phone?.trim() ?? "",
      notes: notes?.trim() ?? "",
    },
  });

  await sendTelegramMessage(
    formatTelegramMessage(
      "создание",
      "Клиент",
      `🚗 Марка: ${client.carBrand}\n🔢 Гос. номер: ${client.licensePlate}\n📞 Телефон: ${client.phone || "—"}`,
      operatorFromSession(auth.session),
    ),
  );

  return NextResponse.json(client, { status: 201 });
}
