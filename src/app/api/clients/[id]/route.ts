import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { archiveRecord } from "@/lib/finance";
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
      `🚗 ${client.carBrand}\n🔢 ${client.licensePlate}`,
      operatorFromSession(auth.session),
    ),
  );

  return NextResponse.json(client);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: { sales: true },
  });

  if (!client) {
    return NextResponse.json({ error: "Клиент не найден" }, { status: 404 });
  }

  for (const sale of client.sales) {
    await archiveRecord(
      "sale",
      sale.id,
      `${client.licensePlate} — ${sale.totalPrice} сум`,
      { ...sale, client },
      auth.session.userId,
    );
  }

  await archiveRecord(
    "client",
    client.id,
    `${client.carBrand} (${client.licensePlate})`,
    client,
    auth.session.userId,
  );

  await prisma.sale.deleteMany({ where: { clientId: id } });
  await prisma.client.delete({ where: { id } });

  await sendTelegramMessage(
    formatTelegramMessage(
      "удаление",
      "Клиент",
      `🚗 ${client.carBrand}\n🔢 ${client.licensePlate}`,
      operatorFromSession(auth.session),
    ),
  );

  return NextResponse.json({ ok: true });
}
