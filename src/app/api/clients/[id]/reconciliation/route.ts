import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/labels";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) {
    return NextResponse.json({ error: "Клиент не найден" }, { status: 404 });
  }

  const dateFilter =
    from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59.999`) } : {}),
          },
        }
      : {};

  const sales = await prisma.sale.findMany({
    where: { clientId: id, ...dateFilter },
    include: {
      debtPayments: { include: { user: { select: { displayName: true } } } },
      goodsDeliveries: true,
      user: { select: { displayName: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  type Movement = {
    date: Date;
    doc: string;
    debit: number;
    credit: number;
    note: string;
  };

  const movements: Movement[] = [];

  for (const sale of sales) {
    movements.push({
      date: sale.createdAt,
      doc: `Продажа ${sale.quantity} шт × ${sale.pricePerUnit}`,
      debit: sale.totalPrice,
      credit: sale.paidAmount,
      note: sale.notes || "",
    });

    for (const payment of sale.debtPayments) {
      if (from || to) {
        const t = payment.createdAt.getTime();
        if (from && t < new Date(from).getTime()) continue;
        if (to && t > new Date(`${to}T23:59:59.999`).getTime()) continue;
      }
      movements.push({
        date: payment.createdAt,
        doc: "Погашение долга",
        debit: 0,
        credit: payment.amount,
        note: payment.note || payment.user.displayName,
      });
    }
  }

  // Include repayments in period for sales outside period
  if (from || to) {
    const extraPayments = await prisma.debtPayment.findMany({
      where: {
        sale: { clientId: id },
        ...dateFilter,
        saleId: { notIn: sales.map((s) => s.id) },
      },
      include: {
        sale: true,
        user: { select: { displayName: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    for (const payment of extraPayments) {
      movements.push({
        date: payment.createdAt,
        doc: "Погашение долга",
        debit: 0,
        credit: payment.amount,
        note: payment.note || payment.user.displayName,
      });
    }
  }

  movements.sort((a, b) => a.date.getTime() - b.date.getTime());

  const openingSales = await prisma.sale.findMany({
    where: {
      clientId: id,
      ...(from ? { createdAt: { lt: new Date(from) } } : { id: "__none__" }),
    },
    include: { debtPayments: true },
  });

  let opening = 0;
  if (from) {
    for (const sale of openingSales) {
      opening += sale.totalPrice - sale.paidAmount;
      for (const p of sale.debtPayments) {
        if (p.createdAt < new Date(from)) opening -= p.amount;
      }
    }
    // repayments before period on later sales
    const earlyPayments = await prisma.debtPayment.findMany({
      where: {
        sale: { clientId: id, createdAt: { gte: new Date(from) } },
        createdAt: { lt: new Date(from) },
      },
    });
    for (const p of earlyPayments) opening -= p.amount;
  }

  let running = opening;
  const totalDebit = movements.reduce((s, m) => s + m.debit, 0);
  const totalCredit = movements.reduce((s, m) => s + m.credit, 0);
  const closing = opening + totalDebit - totalCredit;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ООО "Qurilish resurslari"';
  const sheet = workbook.addWorksheet("Акт сверки");

  sheet.mergeCells("A1:F1");
  sheet.getCell("A1").value = "АКТ СВЕРКИ ВЗАИМОРАСЧЁТОВ";
  sheet.getCell("A1").font = { bold: true, size: 14 };
  sheet.getCell("A1").alignment = { horizontal: "center" };

  sheet.mergeCells("A2:F2");
  sheet.getCell("A2").value =
    `SHLAKOBLOK CRM · Клиент: ${client.carBrand} (${client.licensePlate})`;

  sheet.mergeCells("A3:F3");
  sheet.getCell("A3").value = from && to ? `Период: ${from} — ${to}` : "Период: весь период";

  sheet.addRow([]);
  const header = sheet.addRow([
    "Дата",
    "Документ / операция",
    "Дебет (начисление)",
    "Кредит (оплата)",
    "Сальдо",
    "Примечание",
  ]);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF97316" },
    };
  });

  sheet.addRow([
    from || "—",
    "Сальдо на начало периода",
    opening > 0 ? opening : 0,
    opening < 0 ? Math.abs(opening) : 0,
    opening,
    "",
  ]);

  for (const m of movements) {
    running += m.debit - m.credit;
    sheet.addRow([
      m.date.toLocaleString("ru-RU"),
      m.doc,
      m.debit || "",
      m.credit || "",
      running,
      m.note,
    ]);
  }

  sheet.addRow([]);
  const totals = sheet.addRow([
    "",
    "ИТОГО за период",
    totalDebit,
    totalCredit,
    closing,
    `Сальдо на конец: ${closing > 0 ? "долг клиента" : closing < 0 ? "предоплата" : "0"} ${formatCurrency(Math.abs(closing))}`,
  ]);
  totals.font = { bold: true };

  sheet.columns = [
    { width: 20 },
    { width: 36 },
    { width: 20 },
    { width: 18 },
    { width: 16 },
    { width: 28 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `akt_sverki_${client.licensePlate}_${from || "all"}_${to || "all"}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
