import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, requireAuth } from "@/lib/auth";
import { applySaleEffects } from "@/lib/finance";
import { rollbackChange } from "@/lib/audit";
import { sendTelegramMessage, formatTelegramMessage, operatorFromSession } from "@/lib/telegram";
import type { EntityType } from "@/lib/constants";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const [deleted, changes] = await Promise.all([
    prisma.deletedRecord.findMany({
      include: { deletedBy: { select: { displayName: true, username: true } } },
      orderBy: { deletedAt: "desc" },
    }),
    prisma.changeRecord.findMany({
      include: { changedBy: { select: { displayName: true, username: true } } },
      orderBy: { changedAt: "desc" },
    }),
  ]);

  return NextResponse.json({ deleted, changes });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id, action, type } = await request.json();

  if (action === "restore" && type === "change") {
    const record = await prisma.changeRecord.findUnique({ where: { id } });
    if (!record) {
      return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });
    }

    await rollbackChange(id);

    await sendTelegramMessage(
      formatTelegramMessage(
        "изменение",
        "Откат изменения",
        `↩️ ${record.label}`,
        operatorFromSession(auth.session),
      ),
    );

    return NextResponse.json({ ok: true });
  }

  if (action === "restore") {
    const record = await prisma.deletedRecord.findUnique({ where: { id } });
    if (!record) {
      return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });
    }

    const data = JSON.parse(record.data);
    await restoreEntity(record.entityType as EntityType, data);
    await prisma.deletedRecord.delete({ where: { id: record.id } });

    await sendTelegramMessage(
      formatTelegramMessage(
        "создание",
        "Восстановление данных",
        `♻️ ${record.label}`,
        operatorFromSession(auth.session),
      ),
    );

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const id = request.nextUrl.searchParams.get("id");

  if (id) {
    const record = await prisma.deletedRecord.findUnique({ where: { id } });
    if (!record) {
      return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });
    }

    await prisma.deletedRecord.delete({ where: { id } });

    await sendTelegramMessage(
      formatTelegramMessage(
        "удаление",
        "Окончательное удаление",
        `🗑 ${record.label}`,
        operatorFromSession(auth.session),
      ),
    );

    return NextResponse.json({ ok: true });
  }

  await prisma.deletedRecord.deleteMany();

  await sendTelegramMessage(
    formatTelegramMessage(
      "удаление",
      "Очистка корзины",
      `🗑 Все удалённые записи очищены без восстановления`,
      operatorFromSession(auth.session),
    ),
  );

  return NextResponse.json({ ok: true });
}

async function restoreEntity(entityType: EntityType, data: Record<string, unknown>) {
  switch (entityType) {
    case "client":
      await prisma.client.create({
        data: {
          id: data.id as string,
          carBrand: data.carBrand as string,
          licensePlate: data.licensePlate as string,
          phone: (data.phone as string) ?? "",
          notes: (data.notes as string) ?? "",
          balance: (data.balance as number) ?? 0,
          createdAt: new Date(data.createdAt as string),
          updatedAt: new Date(data.updatedAt as string),
        },
      });
      break;
    case "sale": {
      const sale = await prisma.sale.create({
        data: {
          id: data.id as string,
          clientId: data.clientId as string,
          quantity: data.quantity as number,
          pricePerUnit: data.pricePerUnit as number,
          totalPrice: data.totalPrice as number,
          paymentType: (data.paymentType as string) ?? "paid",
          notes: (data.notes as string) ?? "",
          userId: data.userId as string,
          createdAt: new Date(data.createdAt as string),
          updatedAt: new Date(data.updatedAt as string),
        },
      });
      await applySaleEffects(sale);
      break;
    }
    case "expense":
      await prisma.expense.create({
        data: {
          id: data.id as string,
          categoryId: data.categoryId as string,
          counterpartyId: data.counterpartyId as string,
          amount: data.amount as number,
          note: (data.note as string) ?? "",
          userId: data.userId as string,
          createdAt: new Date(data.createdAt as string),
        },
      });
      break;
    case "counterparty":
      await prisma.counterparty.create({
        data: {
          id: data.id as string,
          name: data.name as string,
          phone: (data.phone as string) ?? "",
          notes: (data.notes as string) ?? "",
          createdAt: new Date(data.createdAt as string),
        },
      });
      break;
    case "expense_category":
      await prisma.expenseCategory.create({
        data: {
          id: data.id as string,
          name: data.name as string,
          createdAt: new Date(data.createdAt as string),
        },
      });
      break;
    case "goods_delivery":
      await prisma.goodsDelivery.create({
        data: {
          id: data.id as string,
          saleId: data.saleId as string,
          quantity: data.quantity as number,
          licensePlate: data.licensePlate as string,
          note: (data.note as string) ?? "",
          userId: data.userId as string,
          createdAt: new Date(data.createdAt as string),
        },
      });
      break;
  }
}
