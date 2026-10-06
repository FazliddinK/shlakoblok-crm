"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { todayDateString } from "@/lib/dates";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/components/i18n-provider";

interface Expense {
  id: string;
  amount: number;
  note: string;
  createdAt: string;
  category: { name: string };
  counterparty: { name: string };
  user: { displayName: string };
}

export default function ExpensesPage() {
  const { t, formatCurrency, formatDateTime } = useI18n();
  const [userName, setUserName] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [counterparties, setCounterparties] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(todayDateString());
  const [to, setTo] = useState(todayDateString());
  const [form, setForm] = useState({
    categoryName: "",
    counterpartyName: "",
    amount: "",
    note: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ from, to });
    const [expRes, catRes, cpRes, meRes] = await Promise.all([
      fetch(`/api/expenses?${params}`),
      fetch("/api/expense-categories"),
      fetch("/api/counterparties"),
      fetch("/api/auth/me"),
    ]);
    const expData = await expRes.json();
    setExpenses(expData.expenses ?? []);
    const cats = await catRes.json();
    const cps = await cpRes.json();
    setCategories(cats.map((c: { name: string }) => c.name));
    setCounterparties(cps.map((c: { name: string }) => c.name));
    const me = await meRes.json();
    setUserName(me.user?.displayName ?? "");
    setLoading(false);
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  function setToday() {
    const today = todayDateString();
    setFrom(today);
    setTo(today);
  }

  async function handleSave() {
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setOpen(false);
      setForm({ categoryName: "", counterpartyName: "", amount: "", note: "" });
      load();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("Удалить расход?"))) return;
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    load();
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-zinc-500">{t("Загрузка...")}</div>;
  }

  const isToday = from === to && from === todayDateString();
  const periodTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div>
      <PageHeader
        title={t("Расходы")}
        description={t("Журнал расходных операций")}
        userName={userName}
        action={
          <Button onClick={() => setOpen(true)} className="bg-orange-500 hover:bg-orange-600">
            <Plus className="mr-2 h-4 w-4" />
            {t("Новый расход")}
          </Button>
        }
      />

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">
              {t("Журнал расходов")}
              {isToday && (
                <span className="ml-2 text-sm font-normal text-zinc-500">({t("Сегодня").toLowerCase()})</span>
              )}
            </CardTitle>
            <p className="mt-1 text-sm text-zinc-500">
              {t("Итого за период")}: <span className="font-semibold text-red-600">{formatCurrency(periodTotal)}</span>
            </p>
          </div>
          <DateRangeFilter
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
            showTodayButton
            onToday={setToday}
          />
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-sm text-zinc-500">{t("Расходов за выбранный период нет")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Дата")}</TableHead>
                  <TableHead>{t("Категория")}</TableHead>
                  <TableHead>{t("Контрагент")}</TableHead>
                  <TableHead>{t("Примечание")}</TableHead>
                  <TableHead>{t("Сумма")}</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatDateTime(e.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{e.category.name}</Badge>
                    </TableCell>
                    <TableCell>{e.counterparty.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-zinc-500">
                      {e.note || "—"}
                    </TableCell>
                    <TableCell className="font-semibold">{formatCurrency(e.amount)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Новый расход")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>{t("Категория расходов *")}</Label>
              <Input
                list="categories-list"
                value={form.categoryName}
                onChange={(e) => setForm({ ...form, categoryName: e.target.value })}
                placeholder={t("Выберите или введите новую")}
              />
              <datalist id="categories-list">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="grid gap-2">
              <Label>{t("Контрагент *")}</Label>
              <Input
                list="counterparties-list"
                value={form.counterpartyName}
                onChange={(e) => setForm({ ...form, counterpartyName: e.target.value })}
                placeholder={t("Выберите или введите нового")}
              />
              <datalist id="counterparties-list">
                {counterparties.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="grid gap-2">
              <Label>{t("Сумма, сум *")}</Label>
              <Input
                type="number"
                min={1}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("Примечание")}</Label>
              <Textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("Отмена")}</Button>
            <Button onClick={handleSave} className="bg-orange-500 hover:bg-orange-600">
              {t("Сохранить")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
