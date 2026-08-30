"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  TrendingDown,
  TrendingUp,
  Wallet,
  Users,
  Package,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { LabeledSelect } from "@/components/ui/labeled-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/labels";
import { REPORT_PERIOD_LABELS, todayDateString } from "@/lib/dates";

interface ReportData {
  period: string;
  from: string;
  to: string;
  periodLabel: string;
  cash: {
    openingBalance: number;
    cashIncome: number;
    totalExpensesAllTime: number;
    cashBalance: number;
    periodIncome: number;
    periodSalesCash: number;
    periodRepayments: number;
    periodExpenses: number;
    netCashResult: number;
  };
  sales: {
    count: number;
    totalQuantity: number;
    totalRevenue: number;
    avgCheck: number;
    paidCount: number;
    prepaymentCount: number;
    debtCount: number;
    prepaymentsReceived: number;
    repaymentsTotal: number;
  };
  debtors: {
    count: number;
    total: number;
    items: {
      clientId: string;
      carBrand: string;
      licensePlate: string;
      balance: number;
      debtSince: string | null;
      lastPaymentAt: string | null;
      lastPaymentAmount: number;
    }[];
  };
  prepayments: {
    count: number;
    total: number;
    items: {
      saleId: string;
      carBrand: string;
      licensePlate: string;
      purchasedQuantity: number;
      deliveredQuantity: number;
      remainingQuantity: number;
      pricePerUnit: number;
      prepaymentRemainingAmount: number;
      paidAmount: number;
      createdAt: string;
    }[];
  };
  goodsPending: { clients: number; blocks: number };
  dailyStats: { date: string; revenue: number; expenses: number; quantity: number; count: number }[];
  categoryStats: { category: string; amount: number }[];
  recentSales: {
    id: string;
    quantity: number;
    totalPrice: number;
    paymentType: string;
    createdAt: string;
    client: { carBrand: string; licensePlate: string };
  }[];
}

const PERIOD_OPTIONS = Object.entries(REPORT_PERIOD_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export default function ReportsPage() {
  const [period, setPeriod] = useState("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<ReportData | null>(null);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [debtorsOpen, setDebtorsOpen] = useState(false);
  const [prepaymentsOpen, setPrepaymentsOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ period });
    if (period === "custom" && from && to) {
      params.set("from", from);
      params.set("to", to);
    }
    const [reportRes, meRes] = await Promise.all([
      fetch(`/api/reports?${params}`),
      fetch("/api/auth/me"),
    ]);
    setData(await reportRes.json());
    const me = await meRes.json();
    setUserName(me.user?.displayName ?? "");
    setLoading(false);
  }, [period, from, to]);

  useEffect(() => {
    if (period === "custom" && (!from || !to)) return;
    load();
  }, [load, period, from, to]);

  function handlePeriodChange(value: string) {
    setPeriod(value);
    if (value === "custom") {
      const today = todayDateString();
      const monthStart = today.slice(0, 8) + "01";
      setFrom(monthStart);
      setTo(today);
    }
  }

  if (loading || !data) {
    return <div className="flex h-64 items-center justify-center text-zinc-500">Загрузка...</div>;
  }

  const maxDaily = Math.max(
    ...data.dailyStats.map((d) => Math.max(d.revenue, d.expenses)),
    1,
  );
  const maxCategory = Math.max(...data.categoryStats.map((c) => c.amount), 1);

  return (
    <div>
      <PageHeader
        title="Отчёты"
        description="Финансово-управленческий dashboard"
        userName={userName}
        action={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            {period === "custom" && (
              <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
            )}
            <LabeledSelect
              value={period}
              onValueChange={handlePeriodChange}
              options={PERIOD_OPTIONS}
              triggerClassName="w-52"
            />
          </div>
        }
      />

      <p className="mb-6 text-sm text-zinc-600">
        Период отчёта: <span className="font-medium">{data.periodLabel}</span>
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          icon={<Wallet className="h-5 w-5 text-orange-500" />}
          title="Остаток в кассе"
          value={formatCurrency(data.cash.cashBalance)}
          hint={`${formatCurrency(data.cash.openingBalance)} + ${formatCurrency(data.cash.cashIncome)} − ${formatCurrency(data.cash.totalExpensesAllTime)}`}
        />
        <KpiCard
          icon={<TrendingUp className="h-5 w-5 text-green-600" />}
          title="Выручка за период"
          value={formatCurrency(data.cash.periodIncome)}
          hint={`Продажи ${formatCurrency(data.cash.periodSalesCash)} + погашения ${formatCurrency(data.cash.periodRepayments)}`}
        />
        <KpiCard
          icon={<TrendingDown className="h-5 w-5 text-red-500" />}
          title="Расходы за период"
          value={formatCurrency(data.cash.periodExpenses)}
        />
        <KpiCard
          title="Чистый денежный результат"
          value={formatCurrency(data.cash.netCashResult)}
          hint="Приходы − расходы за выбранный период"
          valueClassName={data.cash.netCashResult >= 0 ? "text-green-700" : "text-red-600"}
        />
        <ExpandableKpiCard
          icon={<Users className="h-5 w-5 text-red-500" />}
          title="Должники"
          summary={`${data.debtors.count} клиентов · ${formatCurrency(data.debtors.total)}`}
          open={debtorsOpen}
          onToggle={() => setDebtorsOpen((v) => !v)}
        >
          {data.debtors.items.length === 0 ? (
            <p className="text-sm text-zinc-500">Нет должников</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Гос. номер</TableHead>
                  <TableHead>Долг</TableHead>
                  <TableHead className="hidden md:table-cell">С даты</TableHead>
                  <TableHead className="hidden lg:table-cell">Последняя оплата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.debtors.items.map((item) => (
                  <TableRow key={item.clientId}>
                    <TableCell>{item.carBrand}</TableCell>
                    <TableCell className="font-mono">{item.licensePlate}</TableCell>
                    <TableCell className="font-semibold text-red-600">
                      {formatCurrency(item.balance)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs">
                      {item.debtSince ? formatDateTime(item.debtSince) : "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs">
                      {item.lastPaymentAt
                        ? `${formatDateTime(item.lastPaymentAt)} (${formatCurrency(item.lastPaymentAmount)})`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ExpandableKpiCard>
        <ExpandableKpiCard
          icon={<Package className="h-5 w-5 text-blue-600" />}
          title="Активные предоплаты"
          summary={`${data.prepayments.count} клиентов · ${formatCurrency(data.prepayments.total)}`}
          open={prepaymentsOpen}
          onToggle={() => setPrepaymentsOpen((v) => !v)}
        >
          {data.prepayments.items.length === 0 ? (
            <p className="text-sm text-zinc-500">Нет активных предоплат</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Гос. номер</TableHead>
                  <TableHead>Куплено</TableHead>
                  <TableHead>Выдано</TableHead>
                  <TableHead>Осталось</TableHead>
                  <TableHead>Остаток предоплаты</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.prepayments.items.map((item) => (
                  <TableRow key={item.saleId}>
                    <TableCell>{item.carBrand}</TableCell>
                    <TableCell className="font-mono">{item.licensePlate}</TableCell>
                    <TableCell>{item.purchasedQuantity} шт</TableCell>
                    <TableCell>{item.deliveredQuantity} шт</TableCell>
                    <TableCell>{item.remainingQuantity} шт</TableCell>
                    <TableCell className="font-semibold text-blue-600">
                      {formatCurrency(item.prepaymentRemainingAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ExpandableKpiCard>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat title="Продаж за период" value={String(data.sales.count)} />
        <MiniStat title="Продано блоков" value={`${data.sales.totalQuantity.toLocaleString("ru-RU")} шт`} />
        <MiniStat title="Средняя сумма" value={formatCurrency(data.sales.avgCheck)} />
        <MiniStat
          title="Товарные остатки"
          value={`${data.goodsPending.clients} кли. · ${data.goodsPending.blocks} шт`}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Движение денег за период</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Поступления от продаж" value={formatCurrency(data.cash.periodSalesCash)} />
            <Row label="Погашение долгов" value={formatCurrency(data.cash.periodRepayments)} />
            <Row label="Итого поступлений" value={formatCurrency(data.cash.periodIncome)} bold />
            <Row label="Расходы" value={formatCurrency(data.cash.periodExpenses)} negative />
            <Row
              label="Чистый результат"
              value={formatCurrency(data.cash.netCashResult)}
              bold
              highlight={data.cash.netCashResult >= 0 ? "green" : "red"}
            />
            <div className="border-t pt-2">
              <Row
                label="Текущий остаток в кассе"
                value={formatCurrency(data.cash.cashBalance)}
                bold
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Продажи за период</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Количество продаж" value={String(data.sales.count)} />
            <Row label="Количество товара" value={`${data.sales.totalQuantity} шт`} />
            <Row label="Получено денег" value={formatCurrency(data.cash.periodIncome)} bold />
            <Row label="Наличные / оплачено" value={String(data.sales.paidCount)} />
            <Row label="Предоплаты" value={String(data.sales.prepaymentCount)} />
            <Row label="В долг" value={String(data.sales.debtCount)} />
            <Row label="Получено предоплат" value={formatCurrency(data.sales.prepaymentsReceived)} />
            <Row label="Погашение долгов" value={formatCurrency(data.sales.repaymentsTotal)} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Продажи и расходы по дням</CardTitle>
          </CardHeader>
          <CardContent>
            {data.dailyStats.length === 0 ? (
              <p className="text-sm text-zinc-500">Нет данных за период</p>
            ) : (
              <div className="space-y-3">
                {data.dailyStats.map((day) => (
                  <div key={day.date} className="space-y-1">
                    <div className="flex justify-between text-xs text-zinc-500">
                      <span>
                        {new Date(day.date).toLocaleDateString("ru-RU", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                      <span>
                        +{formatCurrency(day.revenue)} / −{formatCurrency(day.expenses)}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <div
                        className="h-2 rounded bg-green-500/80"
                        style={{ width: `${(day.revenue / maxDaily) * 100}%`, minWidth: day.revenue ? "4px" : 0 }}
                      />
                      <div
                        className="h-2 rounded bg-red-400/80"
                        style={{ width: `${(day.expenses / maxDaily) * 100}%`, minWidth: day.expenses ? "4px" : 0 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Расходы по категориям</CardTitle>
          </CardHeader>
          <CardContent>
            {data.categoryStats.length === 0 ? (
              <p className="text-sm text-zinc-500">Нет расходов за период</p>
            ) : (
              <div className="space-y-3">
                {data.categoryStats.map((item) => (
                  <div key={item.category} className="flex items-center gap-3">
                    <Badge variant="secondary" className="shrink-0">
                      {item.category}
                    </Badge>
                    <div className="flex-1">
                      <div
                        className="h-5 rounded bg-orange-500/70"
                        style={{
                          width: `${(item.amount / maxCategory) * 100}%`,
                          minWidth: "4px",
                        }}
                      />
                    </div>
                    <span className="w-28 shrink-0 text-right text-xs font-medium">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Последние продажи за период</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentSales.length === 0 ? (
            <p className="text-sm text-zinc-500">Нет продаж за период</p>
          ) : (
            <ul className="space-y-2">
              {data.recentSales.map((sale) => (
                <li
                  key={sale.id}
                  className="flex flex-col gap-1 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <span className="font-medium">
                      {sale.client.carBrand} · {sale.client.licensePlate}
                    </span>
                    <span className="ml-2 text-zinc-500">
                      {sale.quantity} шт · {formatDateTime(sale.createdAt)}
                    </span>
                  </div>
                  <span className="font-semibold">{formatCurrency(sale.totalPrice)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon,
  title,
  value,
  hint,
  valueClassName,
}: {
  icon?: React.ReactNode;
  title: string;
  value: string;
  hint?: string;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          {icon}
          <div className="min-w-0 flex-1">
            <p className="text-sm text-zinc-500">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${valueClassName ?? ""}`}>{value}</p>
            {hint && <p className="mt-1 text-xs text-zinc-400 break-words">{hint}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ExpandableKpiCard({
  icon,
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="sm:col-span-2 xl:col-span-1">
      <CardContent className="pt-6">
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-start justify-between gap-2 text-left"
        >
          <div className="flex items-start gap-3">
            {icon}
            <div>
              <p className="text-sm text-zinc-500">{title}</p>
              <p className="text-lg font-bold mt-1">{summary}</p>
            </div>
          </div>
          {open ? (
            <ChevronUp className="h-5 w-5 shrink-0 text-zinc-400" />
          ) : (
            <ChevronDown className="h-5 w-5 shrink-0 text-zinc-400" />
          )}
        </button>
        {open && <div className="mt-4 overflow-x-auto">{children}</div>}
      </CardContent>
    </Card>
  );
}

function MiniStat({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-zinc-500">{title}</p>
        <p className="text-lg font-semibold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  bold,
  negative,
  highlight,
}: {
  label: string;
  value: string;
  bold?: boolean;
  negative?: boolean;
  highlight?: "green" | "red";
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-zinc-600">{label}</span>
      <span
        className={`${bold ? "font-semibold" : ""} ${
          negative ? "text-red-600" : highlight === "green" ? "text-green-700" : highlight === "red" ? "text-red-600" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
