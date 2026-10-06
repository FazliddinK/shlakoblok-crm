import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { PAYMENT_TYPE_LABELS } from "@/lib/constants";
import { BUSINESS_TIME_ZONE, buildDateFilter } from "@/lib/dates";
import { DEFAULT_LOCALE, Locale, localeToIntl, translate } from "@/lib/i18n";

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF97316" },
  };
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
}

function autoWidth(sheet: ExcelJS.Worksheet) {
  sheet.columns.forEach((column) => {
    let max = 12;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > max) max = len;
    });
    column.width = Math.min(max + 2, 40);
  });
}

export async function buildExportWorkbook(from?: string, to?: string, locale: Locale = DEFAULT_LOCALE) {
  const t = (source: string) => translate(locale, source);
  const intlLocale = localeToIntl(locale);
  const formatWhen = (value: Date | string) => new Intl.DateTimeFormat(intlLocale, {
    timeZone: BUSINESS_TIME_ZONE,
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
  const dateFilter = buildDateFilter(from, to);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ООО "Qurilish resurslari"';
  workbook.created = new Date();

  const periodLabel =
    from && to
      ? from === to
        ? from
        : `${from} — ${to}`
      : t("Весь период");

  const summary = workbook.addWorksheet(t("Сводка"));
  summary.addRow([t("SHLAKOBLOK CRM — экспорт данных")]);
  summary.addRow([t("Период"), periodLabel]);
  summary.addRow([t("Дата экспорта"), formatWhen(new Date())]);
  summary.addRow([]);

  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  const sales = await prisma.sale.findMany({
    where: dateFilter,
    include: { client: true, user: { select: { displayName: true } } },
    orderBy: { createdAt: "desc" },
  });
  const expenses = await prisma.expense.findMany({
    where: dateFilter,
    include: {
      category: true,
      counterparty: true,
      user: { select: { displayName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const clients = await prisma.client.findMany({ orderBy: { licensePlate: "asc" } });
  const debtPayments = await prisma.debtPayment.findMany({
    where: dateFilter,
    include: {
      sale: { include: { client: true } },
      user: { select: { displayName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const users = await prisma.user.findMany({
    select: { username: true, displayName: true, role: true, createdAt: true },
  });

  const salesRevenue = sales.reduce((s, x) => s + x.totalPrice, 0);
  const expenseTotal = expenses.reduce((s, x) => s + x.amount, 0);
  const repaymentTotal = debtPayments.reduce((s, x) => s + x.amount, 0);

  summary.addRow([t("Показатель"), t("Значение")]);
  styleHeader(summary.getRow(5));
  summary.addRow([t("Начальный остаток кассы"), settings?.openingBalance ?? 0]);
  summary.addRow([t("Продаж (шт)"), sales.length]);
  summary.addRow([t("Выручка по продажам"), salesRevenue]);
  summary.addRow([t("Погашения долга"), repaymentTotal]);
  summary.addRow([t("Расходов (шт)"), expenses.length]);
  summary.addRow([t("Сумма расходов"), expenseTotal]);
  summary.addRow([t("Клиентов"), clients.length]);
  summary.addRow([t("Пользователей"), users.length]);
  autoWidth(summary);

  const salesSheet = workbook.addWorksheet(t("Продажи"));
  salesSheet.addRow([
    t("Дата"),
    t("Марка"),
    t("Гос. номер"),
    t("Кол-во"),
    t("Цена/шт"),
    t("Итого"),
    t("Тип оплаты"),
    t("Примечание"),
    t("Оператор"),
  ]);
  styleHeader(salesSheet.getRow(1));
  for (const sale of sales) {
    salesSheet.addRow([
      formatWhen(sale.createdAt),
      sale.client.carBrand,
      sale.client.licensePlate,
      sale.quantity,
      sale.pricePerUnit,
      sale.totalPrice,
      t(PAYMENT_TYPE_LABELS[sale.paymentType] ?? sale.paymentType),
      sale.notes,
      sale.user.displayName,
    ]);
  }
  autoWidth(salesSheet);

  const expensesSheet = workbook.addWorksheet(t("Расходы"));
  expensesSheet.addRow([
    t("Дата"),
    t("Категория"),
    t("Контрагент"),
    t("Сумма"),
    t("Примечание"),
    t("Оператор"),
  ]);
  styleHeader(expensesSheet.getRow(1));
  for (const expense of expenses) {
    expensesSheet.addRow([
      formatWhen(expense.createdAt),
      expense.category.name,
      expense.counterparty.name,
      expense.amount,
      expense.note,
      expense.user.displayName,
    ]);
  }
  autoWidth(expensesSheet);

  const clientsSheet = workbook.addWorksheet(t("Клиенты"));
  clientsSheet.addRow([
    t("Марка"),
    t("Гос. номер"),
    t("Телефон"),
    t("Баланс"),
    t("Примечание"),
    t("Дата регистрации"),
  ]);
  styleHeader(clientsSheet.getRow(1));
  for (const client of clients) {
    clientsSheet.addRow([
      client.carBrand,
      client.licensePlate,
      client.phone,
      client.balance,
      client.notes,
      formatWhen(client.createdAt),
    ]);
  }
  autoWidth(clientsSheet);

  const repaySheet = workbook.addWorksheet(t("Погашения долга"));
  repaySheet.addRow([
    t("Дата"),
    t("Гос. номер"),
    t("Марка"),
    t("Сумма"),
    t("Примечание"),
    t("Оператор"),
  ]);
  styleHeader(repaySheet.getRow(1));
  for (const payment of debtPayments) {
    repaySheet.addRow([
      formatWhen(payment.createdAt),
      payment.sale.client.licensePlate,
      payment.sale.client.carBrand,
      payment.amount,
      payment.note,
      payment.user.displayName,
    ]);
  }
  autoWidth(repaySheet);

  const deliveries = await prisma.goodsDelivery.findMany({
    where: dateFilter,
    include: {
      sale: { include: { client: true } },
      user: { select: { displayName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const deliveriesSheet = workbook.addWorksheet(t("Выдачи товара"));
  deliveriesSheet.addRow([
    t("Дата"),
    t("Марка"),
    t("Гос. номер клиента"),
    t("Гос. номер выдачи"),
    t("Кол-во"),
    t("Примечание"),
    t("Оператор"),
  ]);
  styleHeader(deliveriesSheet.getRow(1));
  for (const delivery of deliveries) {
    deliveriesSheet.addRow([
      formatWhen(delivery.createdAt),
      delivery.sale.client.carBrand,
      delivery.sale.client.licensePlate,
      delivery.licensePlate,
      delivery.quantity,
      delivery.note,
      delivery.user.displayName,
    ]);
  }
  autoWidth(deliveriesSheet);

  const usersSheet = workbook.addWorksheet(t("Пользователи"));
  usersSheet.addRow([t("Логин"), t("Имя"), t("Роль"), t("Создан")]);
  styleHeader(usersSheet.getRow(1));
  for (const user of users) {
    usersSheet.addRow([
      user.username,
      user.displayName,
      t(user.role === "admin" ? "Админ" : "Оператор"),
      formatWhen(user.createdAt),
    ]);
  }
  autoWidth(usersSheet);

  return workbook;
}
