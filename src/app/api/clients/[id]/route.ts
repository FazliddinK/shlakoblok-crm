import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { sendTelegramMessage, formatTelegramMessage, operatorFromSession } from "@/lib/telegram";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: { sales: { orderBy: { createdAt: "desc" }, include: { user: true } } },
  });

  if (!client) {
    return NextResponse.json({ error: "Клиент не найден" }, { status: 404 });
  }

  return NextResponse.json(client);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { carBrand, licensePlate, phone, notes } = body;

  const client = await prisma.client.update({
    where: { id },
    data: {
      carBrand: carBrand?.trim(),
      licensePlate: licensePlate?.trim().toUpperCase(),
      phone: phone?.trim() ?? "",
      notes: notes?.trim() ?? "",
    },
  });

  await sendTelegramMessage(
    formatTelegramMessage(
      "изменение",
      "Клиент",
      `🚗 Марка: ${client.carBrand}\n🔢 Гос. номер: ${client.licensePlate}\n📞 Телефон: ${client.phone || "—"}`,
      operatorFromSession(auth.session),
    ),
  );

  return NextResponse.json(client);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const client = await prisma.client.findUnique({ where: { id } });

  if (!client) {
    return NextResponse.json({ error: "Клиент не найден" }, { status: 404 });
  }

  await prisma.client.delete({ where: { id } });

  await sendTelegramMessage(
    formatTelegramMessage(
      "удаление",
      "Клиент",
      `🚗 Марка: ${client.carBrand}\n🔢 Гос. номер: ${client.licensePlate}`,
      operatorFromSession(auth.session),
    ),
  );

  return NextResponse.json({ ok: true });
}
