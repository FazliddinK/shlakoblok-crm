import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/labels";
import { BUSINESS_TIME_ZONE, buildDateFilter } from "@/lib/dates";
import { localeToIntl, translate } from "@/lib/i18n";
import { requestLocale } from "@/lib/i18n-server";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const locale = requestLocale(request);
    const t = (source: string) => translate(locale, source);
    const intlLocale = localeToIntl(locale);
    const formatWhen = (value: Date | string) => new Intl.DateTimeFormat(intlLocale, {
      timeZone: BUSINESS_TIME_ZONE,
      dateStyle: "short",
      timeStyle: "medium",
    }).format(new Date(value));
    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) {
      return NextResponse.json({ error: t("Клиент не найден") }, { status: 404 });
    }

    const dateFilter = buildDateFilter(from, to);
    const fromBoundary = from ? new Date(`${from}T00:00:00.000+05:00`) : null;
    const toBoundary = to ? new Date(`${to}T23:59:59.999+05:00`) : null;

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
        doc: `${t("Продажа")} ${sale.quantity} ${locale === "ru" ? "шт" : "dona"} × ${sale.pricePerUnit}`,
        debit: sale.totalPrice,
        credit: sale.paidAmount ?? 0,
        note: sale.notes || "",
      });

      for (const payment of sale.debtPayments) {
        if (from || to) {
          const t = payment.createdAt.getTime();
          if (fromBoundary && t < fromBoundary.getTime()) continue;
          if (toBoundary && t > toBoundary.getTime()) continue;
        }
        movements.push({
          date: payment.createdAt,
          doc: t("Погашение долга"),
          debit: 0,
          credit: payment.amount,
          note: payment.note || payment.user.displayName,
        });
      }
    }

    if (from || to) {
      const extraPayments = await prisma.debtPayment.findMany({
        where: {
          sale: { clientId: id },
          ...dateFilter,
          saleId: { notIn: sales.map((s) => s.id) },
        },
        include: {
          user: { select: { displayName: true } },
        },
        orderBy: { createdAt: "asc" },
      });
      for (const payment of extraPayments) {
        movements.push({
          date: payment.createdAt,
          doc: t("Погашение долга"),
          debit: 0,
          credit: payment.amount,
          note: payment.note || payment.user.displayName,
        });
      }
    }

    movements.sort((a, b) => a.date.getTime() - b.date.getTime());

    let opening = 0;
    if (from) {
      const openingSales = await prisma.sale.findMany({
        where: { clientId: id, createdAt: { lt: fromBoundary! } },
        include: { debtPayments: true },
      });
      for (const sale of openingSales) {
        opening += sale.totalPrice - (sale.paidAmount ?? 0);
        for (const p of sale.debtPayments) {
          if (p.createdAt < fromBoundary!) opening -= p.amount;
        }
      }
      const earlyPayments = await prisma.debtPayment.findMany({
        where: {
          sale: { clientId: id, createdAt: { gte: fromBoundary! } },
          createdAt: { lt: fromBoundary! },
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
    const sheet = workbook.addWorksheet(t("Акт сверки"));

    sheet.mergeCells("A1:F1");
    sheet.getCell("A1").value = t("АКТ СВЕРКИ ВЗАИМОРАСЧЁТОВ");
    sheet.getCell("A1").font = { bold: true, size: 14 };
    sheet.getCell("A1").alignment = { horizontal: "center" };

    sheet.mergeCells("A2:F2");
    sheet.getCell("A2").value =
      `SHLAKOBLOK CRM · ${t("Клиент")}: ${client.carBrand} (${client.licensePlate})`;

    sheet.mergeCells("A3:F3");
    sheet.getCell("A3").value =
      from && to ? `${t("Период")}: ${from} — ${to}` : `${t("Период")}: ${t("Весь период").toLowerCase()}`;

    sheet.addRow([]);
    const header = sheet.addRow([
      t("Дата"),
      t("Документ / операция"),
      t("Дебет (начисление)"),
      t("Кредит (оплата)"),
      t("Сальдо"),
      t("Примечание"),
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
      t("Сальдо на начало периода"),
      opening > 0 ? opening : 0,
      opening < 0 ? Math.abs(opening) : 0,
      opening,
      "",
    ]);

    for (const m of movements) {
      running += m.debit - m.credit;
      sheet.addRow([
        formatWhen(m.date),
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
      t("ИТОГО за период"),
      totalDebit,
      totalCredit,
      closing,
      `${t("Сальдо на конец")}: ${
        closing > 0 ? t("долг клиента") : closing < 0 ? t("предоплата") : "0"
      } ${formatCurrency(Math.abs(closing), locale)}`,
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
    const safePlate = String(client.licensePlate || "client")
      .replace(/[^\w\-]+/g, "_")
      .slice(0, 40);
    const filename = `${locale === "ru" ? "akt_sverki" : "solishtirma_dalolatnoma"}_${safePlate}_${from || "all"}_${to || "all"}.xlsx`;
    const bytes = Buffer.from(buffer);

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Content-Length": String(bytes.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("reconciliation error", error);
    return NextResponse.json(
      { error: translate(requestLocale(request), "Не удалось сформировать акт сверки") },
      { status: 500 },
    );
  }
}
