import { prisma } from "@/lib/db";
import type { EntityType } from "@/lib/constants";
import { PAYMENT_TYPE_LABELS } from "@/lib/constants";
import {
  applySaleEffects,
  reverseDebtPaymentsForSale,
  reverseSaleEffects,
} from "@/lib/finance";

export async function logChange(
  entityType: EntityType,
  entityId: string,
  label: string,
  oldData: unknown,
  newData: unknown,
  changedById: string,
) {
  await prisma.changeRecord.create({
    data: {
      entityType,
      entityId,
      label,
      oldData: JSON.stringify(oldData),
      newData: JSON.stringify(newData),
      changedById,
    },
  });
}

export async function rollbackChange(recordId: string) {
  const record = await prisma.changeRecord.findUnique({ where: { id: recordId } });
  if (!record) throw new Error("Запись изменения не найдена");

  const oldData = JSON.parse(record.oldData) as Record<string, unknown>;
  const entityType = record.entityType as EntityType;

  switch (entityType) {
    case "sale": {
      const existing = await prisma.sale.findUnique({ where: { id: record.entityId } });
      if (!existing) throw new Error("Продажа не найдена");

      await reverseDebtPaymentsForSale(existing.id, existing.clientId);
      await reverseSaleEffects(existing);

      const restored = await prisma.sale.update({
        where: { id: record.entityId },
        data: {
          quantity: oldData.quantity as number,
          pricePerUnit: oldData.pricePerUnit as number,
          totalPrice: oldData.totalPrice as number,
          paymentType: (oldData.paymentType as string) ?? "paid",
          notes: (oldData.notes as string) ?? "",
        },
      });
      await applySaleEffects(restored);
      break;
    }
    case "client":
      await prisma.client.update({
        where: { id: record.entityId },
        data: {
          carBrand: oldData.carBrand as string,
          licensePlate: oldData.licensePlate as string,
          phone: (oldData.phone as string) ?? "",
          notes: (oldData.notes as string) ?? "",
        },
      });
      break;
    case "goods_delivery":
      await prisma.goodsDelivery.update({
        where: { id: record.entityId },
        data: {
          quantity: oldData.quantity as number,
          licensePlate: oldData.licensePlate as string,
          note: (oldData.note as string) ?? "",
        },
      });
      break;
    default:
      throw new Error("Восстановление этого типа записи не поддерживается");
  }

  await prisma.changeRecord.delete({ where: { id: recordId } });
}

export function describeChanges(
  entityType: EntityType,
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>,
): string {
  const fields: Record<string, string> = {
    carBrand: "Марка",
    licensePlate: "Гос. номер",
    phone: "Телефон",
    notes: "Примечание",
    note: "Примечание",
    quantity: "Кол-во",
    pricePerUnit: "Цена/шт",
    totalPrice: "Итого",
    paymentType: "Тип оплаты",
  };

  const formatValue = (key: string, value: unknown) => {
    if (key === "paymentType" && typeof value === "string") {
      return PAYMENT_TYPE_LABELS[value] ?? value;
    }
    return value ?? "—";
  };

  const parts: string[] = [];
  for (const [key, label] of Object.entries(fields)) {
    const oldVal = oldData[key];
    const newVal = newData[key];
    if (oldVal !== newVal && (oldVal !== undefined || newVal !== undefined)) {
      parts.push(`${label}: ${formatValue(key, oldVal)} → ${formatValue(key, newVal)}`);
    }
  }

  if (parts.length === 0) return "Изменены данные";
  return parts.join("; ");
}
