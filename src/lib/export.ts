import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { PAYMENT_TYPE_LABELS } from "@/lib/constants";
import { buildDateFilter } from "@/lib/dates";

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

export async function buildExportWorkbook(from?: string, to?: string) {
  const dateFilter = buildDateFilter(from, to);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ООО "Qurilish resurslari"';
  workbook.created = new Date();

  const periodLabel =
    from && to
      ? from === to
        ? from
        : `${from} — ${to}`
      : "Весь период";

  const summary = workbook.addWorksheet("Сводка");
  summary.addRow(["SHLAKOBLOK CRM — экспорт данных"]);
  summary.addRow(["Период", periodLabel]);
  summary.addRow(["Дата экспорта", new Date().toLocaleString("ru-RU")]);
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

  summary.addRow(["Показатель", "Значение"]);
  styleHeader(summary.getRow(5));
  summary.addRow(["Начальный остаток кассы", settings?.openingBalance ?? 0]);
  summary.addRow(["Продаж (шт)", sales.length]);
  summary.addRow(["Выручка по продажам", salesRevenue]);
  summary.addRow(["Погашения долга", repaymentTotal]);
  summary.addRow(["Расходов (шт)", expenses.length]);
  summary.addRow(["Сумма расходов", expenseTotal]);
  summary.addRow(["Клиентов", clients.length]);
  summary.addRow(["Пользователей", users.length]);
  autoWidth(summary);

  const salesSheet = workbook.addWorksheet("Продажи");
  salesSheet.addRow([
    "Дата",
    "Марка",
    "Гос. номер",
    "Кол-во",
    "Цена/шт",
    "Итого",
    "Тип оплаты",
    "Примечание",
    "Оператор",
  ]);
  styleHeader(salesSheet.getRow(1));
  for (const sale of sales) {
    salesSheet.addRow([
      new Date(sale.createdAt).toLocaleString("ru-RU"),
      sale.client.carBrand,
      sale.client.licensePlate,
      sale.quantity,
      sale.pricePerUnit,
      sale.totalPrice,
      PAYMENT_TYPE_LABELS[sale.paymentType] ?? sale.paymentType,
      sale.notes,
      sale.user.displayName,
    ]);
  }
  autoWidth(salesSheet);

  const expensesSheet = workbook.addWorksheet("Расходы");
  expensesSheet.addRow([
    "Дата",
    "Категория",
    "Контрагент",
    "Сумма",
    "Примечание",
    "Оператор",
  ]);
  styleHeader(expensesSheet.getRow(1));
  for (const expense of expenses) {
    expensesSheet.addRow([
      new Date(expense.createdAt).toLocaleString("ru-RU"),
      expense.category.name,
      expense.counterparty.name,
      expense.amount,
      expense.note,
      expense.user.displayName,
    ]);
  }
  autoWidth(expensesSheet);

  const clientsSheet = workbook.addWorksheet("Клиенты");
  clientsSheet.addRow([
    "Марка",
    "Гос. номер",
    "Телефон",
    "Баланс",
    "Примечание",
    "Дата регистрации",
  ]);
  styleHeader(clientsSheet.getRow(1));
  for (const client of clients) {
    clientsSheet.addRow([
      client.carBrand,
      client.licensePlate,
      client.phone,
      client.balance,
      client.notes,
      new Date(client.createdAt).toLocaleString("ru-RU"),
    ]);
  }
  autoWidth(clientsSheet);

  const repaySheet = workbook.addWorksheet("Погашения долга");
  repaySheet.addRow([
    "Дата",
    "Гос. номер",
    "Марка",
    "Сумма",
    "Примечание",
    "Оператор",
  ]);
  styleHeader(repaySheet.getRow(1));
  for (const payment of debtPayments) {
    repaySheet.addRow([
      new Date(payment.createdAt).toLocaleString("ru-RU"),
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

  const deliveriesSheet = workbook.addWorksheet("Выдачи товара");
  deliveriesSheet.addRow([
    "Дата",
    "Марка",
    "Гос. номер клиента",
    "Гос. номер выдачи",
    "Кол-во",
    "Примечание",
    "Оператор",
  ]);
  styleHeader(deliveriesSheet.getRow(1));
  for (const delivery of deliveries) {
    deliveriesSheet.addRow([
      new Date(delivery.createdAt).toLocaleString("ru-RU"),
      delivery.sale.client.carBrand,
      delivery.sale.client.licensePlate,
      delivery.licensePlate,
      delivery.quantity,
      delivery.note,
      delivery.user.displayName,
    ]);
  }
  autoWidth(deliveriesSheet);

  const usersSheet = workbook.addWorksheet("Пользователи");
  usersSheet.addRow(["Логин", "Имя", "Роль", "Создан"]);
  styleHeader(usersSheet.getRow(1));
  for (const user of users) {
    usersSheet.addRow([
      user.username,
      user.displayName,
      user.role === "admin" ? "Админ" : "Оператор",
      new Date(user.createdAt).toLocaleString("ru-RU"),
    ]);
  }
  autoWidth(usersSheet);

  return workbook;
}
