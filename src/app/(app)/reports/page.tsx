"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { LabeledSelect } from "@/components/ui/labeled-select";
import { formatCurrency, formatDateTime } from "@/lib/labels";
import { todayDateString } from "@/lib/dates";

interface ReportData {
  period: string;
  from: string;
  to: string;
  summary: {
    totalRevenue: number;
    totalQuantity: number;
    salesCount: number;
    avgCheck: number;
    totalClients: number;
    totalSalesAllTime: number;
    totalExpenses: number;
    expensesCount: number;
  };
  dailyStats: { date: string; revenue: number; quantity: number; count: number }[];
  topClients: { carBrand: string; licensePlate: string; total: number; count: number }[];
  recentSales: {
    id: string;
    quantity: number;
    totalPrice: number;
    createdAt: string;
    client: { carBrand: string; licensePlate: string };
  }[];
}

const PERIOD_LABELS: Record<string, string> = {
  today: "Сегодня",
  week: "Неделя",
  month: "Месяц",
  year: "Год",
  custom: "Период",
};

export default function ReportsPage() {
  const [period, setPeriod] = useState("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<ReportData | null>(null);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);

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

  const maxRevenue = Math.max(...data.dailyStats.map((d) => d.revenue), 1);

  return (
    <div>
      <PageHeader
        title="Отчёты и аналитика"
        description={
          period === "custom"
            ? `Период: ${from} — ${to}`
            : `Период: ${PERIOD_LABELS[period] ?? period}`
        }
        userName={userName}
        action={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            {period === "custom" && (
              <DateRangeFilter
                from={from}
                to={to}
                onFromChange={setFrom}
                onToChange={setTo}
              />
            )}
            <LabeledSelect
              value={period}
              onValueChange={(value) => handlePeriodChange(value)}
              options={Object.entries(PERIOD_LABELS).map(([value, label]) => ({ value, label }))}
              triggerClassName="w-48"
            />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Выручка" value={formatCurrency(data.summary.totalRevenue)} />
        <StatCard
          title="Продано блоков"
          value={data.summary.totalQuantity.toLocaleString("ru-RU") + " шт"}
        />
        <StatCard title="Кол-во продаж" value={String(data.summary.salesCount)} />
        <StatCard title="Средний чек" value={formatCurrency(data.summary.avgCheck)} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Расходы за период" value={formatCurrency(data.summary.totalExpenses)} small />
        <StatCard title="Кол-во расходов" value={String(data.summary.expensesCount)} small />
        <StatCard title="Всего клиентов" value={String(data.summary.totalClients)} small />
        <StatCard title="Всего продаж" value={String(data.summary.totalSalesAllTime)} small />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Выручка по дням</CardTitle>
          </CardHeader>
          <CardContent>
            {data.dailyStats.length === 0 ? (
              <p className="text-sm text-zinc-500">Нет данных за период</p>
            ) : (
              <div className="space-y-2">
                {data.dailyStats.map((day) => (
                  <div key={day.date} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-xs text-zinc-500">
                      {new Date(day.date).toLocaleDateString("ru-RU", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                    <div className="flex-1">
                      <div
                        className="h-6 rounded bg-orange-500/80 transition-all"
                        style={{ width: `${(day.revenue / maxRevenue) * 100}%`, minWidth: "4px" }}
                      />
                    </div>
                    <span className="w-24 shrink-0 text-right text-xs font-medium">
                      {formatCurrency(day.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Топ клиентов</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topClients.length === 0 ? (
              <p className="text-sm text-zinc-500">Нет данных</p>
            ) : (
              <ul className="space-y-3">
                {data.topClients.map((client, i) => (
                  <li key={client.licensePlate} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="w-6 justify-center">{i + 1}</Badge>
                      <div>
                        <p className="text-sm font-medium">{client.carBrand}</p>
                        <p className="text-xs font-mono text-zinc-500">{client.licensePlate}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(client.total)}</p>
                      <p className="text-xs text-zinc-500">{client.count} продаж</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Последние продажи за период</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {data.recentSales.map((sale) => (
              <li
                key={sale.id}
                className="flex items-center justify-between rounded-lg border p-3 text-sm"
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
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  small,
}: {
  title: string;
  value: string;
  small?: boolean;
}) {
  return (
    <Card>
      <CardContent className={small ? "py-4" : "pt-6"}>
        <p className="text-sm text-zinc-500">{title}</p>
        <p className={`font-bold ${small ? "text-xl" : "text-2xl"} mt-1`}>{value}</p>
      </CardContent>
    </Card>
  );
}
