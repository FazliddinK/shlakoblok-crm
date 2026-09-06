"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Package,
  Banknote,
  Scale,
  Wallet,
  Users,
  PiggyBank,
  Receipt,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { LabeledSelect } from "@/components/ui/labeled-select";
import { formatCurrency } from "@/lib/labels";
import { REPORT_PERIOD_LABELS, todayDateString } from "@/lib/dates";

interface ReportData {
  period: string;
  from: string;
  to: string;
  periodLabel: string;
  soldQuantity: number;
  soldAmount: number;
  avgPricePerUnit: number;
  dailySales: { date: string; amount: number; quantity: number; count: number }[];
  prepaymentsTotal: number;
  debtTotal: number;
  periodExpenses: number;
  cashBalance: number;
}

const PERIOD_OPTIONS = Object.entries(REPORT_PERIOD_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export default function ReportsPage() {
  const [period, setPeriod] = useState("last7");
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
      setFrom(`${today.slice(0, 8)}01`);
      setTo(today);
    }
  }

  if (loading || !data) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-500">
        Загрузка...
      </div>
    );
  }

  const maxDailyAmount = Math.max(...data.dailySales.map((d) => d.amount), 1);

  return (
    <div>
      <PageHeader
        title="Отчёты"
        description="Продажи, касса, долги и расходы"
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
              onValueChange={handlePeriodChange}
              options={PERIOD_OPTIONS}
              triggerClassName="w-52"
            />
          </div>
        }
      />

      <p className="mb-6 text-sm text-zinc-600">
        Период: <span className="font-medium">{data.periodLabel}</span>
        <span className="text-zinc-400">
          {" "}
          ({data.from} — {data.to})
        </span>
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={<Package className="h-5 w-5 text-orange-500" />}
          title="Продано товара"
          value={`${data.soldQuantity.toLocaleString("ru-RU")} шт`}
          hint="Фактический отпуск со склада (наличка и долг)"
        />
        <Kpi
          icon={<Banknote className="h-5 w-5 text-green-600" />}
          title="Сумма проданного товара"
          value={formatCurrency(data.soldAmount)}
          hint="Итог всех продаж за период"
        />
        <Kpi
          icon={<Scale className="h-5 w-5 text-blue-600" />}
          title="Средняя цена за штуку"
          value={formatCurrency(data.avgPricePerUnit)}
          hint="Сумма ÷ количество"
        />
        <Kpi
          icon={<Wallet className="h-5 w-5 text-emerald-700" />}
          title="Фактический остаток в кассе"
          value={formatCurrency(data.cashBalance)}
          hint="Текущий остаток кассы"
        />
        <Kpi
          icon={<PiggyBank className="h-5 w-5 text-sky-600" />}
          title="Предоплаты"
          value={formatCurrency(data.prepaymentsTotal)}
          hint="Сумма предоплат клиентов"
        />
        <Kpi
          icon={<Users className="h-5 w-5 text-red-500" />}
          title="Сумма долга"
          value={formatCurrency(data.debtTotal)}
          hint="Сумма долга клиентов"
        />
        <Kpi
          icon={<Receipt className="h-5 w-5 text-rose-500" />}
          title="Расходы за период"
          value={formatCurrency(data.periodExpenses)}
          hint="Сумма всех расходов за период"
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">График продаж по дням</CardTitle>
        </CardHeader>
        <CardContent>
          {data.dailySales.every((d) => d.amount === 0 && d.quantity === 0) ? (
            <p className="text-sm text-zinc-500">Нет продаж за выбранный период</p>
          ) : (
            <div className="space-y-3">
              {data.dailySales.map((day) => (
                <div key={day.date} className="space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                    <span>
                      {new Date(`${day.date}T12:00:00`).toLocaleDateString("ru-RU", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                    <span>
                      {day.quantity.toLocaleString("ru-RU")} шт ·{" "}
                      {formatCurrency(day.amount)}
                    </span>
                  </div>
                  <div className="h-3 rounded bg-zinc-100">
                    <div
                      className="h-3 rounded bg-orange-500/80 transition-all"
                      style={{
                        width: `${(day.amount / maxDailyAmount) * 100}%`,
                        minWidth: day.amount > 0 ? "4px" : 0,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  icon,
  title,
  value,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          {icon}
          <div className="min-w-0 flex-1">
            <p className="text-sm text-zinc-500">{title}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
            {hint ? <p className="mt-1 text-xs text-zinc-400">{hint}</p> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
