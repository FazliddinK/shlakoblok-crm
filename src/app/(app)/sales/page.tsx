"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, Printer } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/labels";
import { printReceipt, type SaleWithRelations } from "@/components/sales/receipt";

interface Client {
  id: string;
  carBrand: string;
  licensePlate: string;
  phone: string;
}

export default function SalesPage() {
  const [sales, setSales] = useState<SaleWithRelations[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [userName, setUserName] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SaleWithRelations | null>(null);
  const [mode, setMode] = useState<"existing" | "new">("new");
  const [form, setForm] = useState({
    clientId: "",
    carBrand: "",
    licensePlate: "",
    phone: "",
    quantity: "",
    pricePerUnit: "85",
    totalPrice: "",
    notes: "",
  });

  const load = useCallback(async () => {
    const [salesRes, clientsRes, meRes] = await Promise.all([
      fetch(`/api/sales?search=${encodeURIComponent(search)}`),
      fetch("/api/clients"),
      fetch("/api/auth/me"),
    ]);
    setSales(await salesRes.json());
    setClients(await clientsRes.json());
    const me = await meRes.json();
    setUserName(me.user?.displayName ?? "");
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  function recalcTotal(qty: string, price: string) {
    const q = Number(qty);
    const p = Number(price);
    if (q && p) return String(q * p);
    return "";
  }

  function openCreate() {
    setEditing(null);
    setMode("new");
    setForm({
      clientId: "",
      carBrand: "",
      licensePlate: "",
      phone: "",
      quantity: "",
      pricePerUnit: "85",
      totalPrice: "",
      notes: "",
    });
    setOpen(true);
  }

  function openEdit(sale: SaleWithRelations) {
    setEditing(sale);
    setMode("existing");
    setForm({
      clientId: sale.clientId,
      carBrand: sale.client.carBrand,
      licensePlate: sale.client.licensePlate,
      phone: sale.client.phone,
      quantity: String(sale.quantity),
      pricePerUnit: String(sale.pricePerUnit),
      totalPrice: String(sale.totalPrice),
      notes: sale.notes,
    });
    setOpen(true);
  }

  async function handleSave(andPrint: boolean) {
    const total =
      Number(form.totalPrice) ||
      Number(form.quantity) * Number(form.pricePerUnit);

    const payload = editing
      ? {
          quantity: Number(form.quantity),
          pricePerUnit: Number(form.pricePerUnit),
          totalPrice: total,
          notes: form.notes,
        }
      : {
          clientId: mode === "existing" ? form.clientId : undefined,
          carBrand: mode === "new" ? form.carBrand : undefined,
          licensePlate: mode === "new" ? form.licensePlate : undefined,
          phone: mode === "new" ? form.phone : undefined,
          quantity: Number(form.quantity),
          pricePerUnit: Number(form.pricePerUnit),
          totalPrice: total,
          notes: form.notes,
        };

    const url = editing ? `/api/sales/${editing.id}` : "/api/sales";
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const sale = await res.json();
      setOpen(false);
      load();
      if (andPrint) printReceipt(sale);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Удалить продажу?")) return;
    await fetch(`/api/sales/${id}`, { method: "DELETE" });
    load();
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-zinc-500">Загрузка...</div>;
  }

  return (
    <div>
      <PageHeader
        title="Продажи"
        description="Оформление продаж шлакоблоков и печать чеков"
        userName={userName}
        action={
          <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600">
            <Plus className="mr-2 h-4 w-4" />
            Новая продажа
          </Button>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          placeholder="Поиск по марке или номеру..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {sales.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-zinc-500">
          Продаж пока нет. Оформите первую продажу.
        </div>
      ) : (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Клиент</TableHead>
                <TableHead className="hidden md:table-cell">Гос. номер</TableHead>
                <TableHead>Кол-во</TableHead>
                <TableHead>Цена/шт</TableHead>
                <TableHead>Итого</TableHead>
                <TableHead className="w-32">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {formatDateTime(sale.createdAt)}
                  </TableCell>
                  <TableCell className="font-medium">{sale.client.carBrand}</TableCell>
                  <TableCell className="hidden md:table-cell font-mono">
                    {sale.client.licensePlate}
                  </TableCell>
                  <TableCell>{sale.quantity} шт</TableCell>
                  <TableCell>{formatCurrency(sale.pricePerUnit)}</TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(sale.totalPrice)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Печать чека"
                        onClick={() => printReceipt(sale)}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(sale)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(sale.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Редактировать продажу" : "Новая продажа"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {!editing && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={mode === "new" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode("new")}
                  className={mode === "new" ? "bg-orange-500 hover:bg-orange-600" : ""}
                >
                  Новый клиент
                </Button>
                <Button
                  type="button"
                  variant={mode === "existing" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode("existing")}
                  className={mode === "existing" ? "bg-orange-500 hover:bg-orange-600" : ""}
                >
                  Из базы
                </Button>
              </div>
            )}

            {!editing && mode === "existing" ? (
              <div className="grid gap-2">
                <Label>Клиент</Label>
                <Select
                  value={form.clientId}
                  onValueChange={(v) => v && setForm({ ...form, clientId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите клиента" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.carBrand} · {c.licensePlate}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label>Марка авто *</Label>
                  <Input
                    value={form.carBrand}
                    onChange={(e) => setForm({ ...form, carBrand: e.target.value })}
                    disabled={!!editing}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Гос. номер *</Label>
                  <Input
                    value={form.licensePlate}
                    onChange={(e) =>
                      setForm({ ...form, licensePlate: e.target.value.toUpperCase() })
                    }
                    className="font-mono uppercase"
                    disabled={!!editing}
                  />
                </div>
                {!editing && (
                  <div className="grid gap-2">
                    <Label>Телефон</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                )}
              </>
            )}

            <div className="rounded-lg bg-zinc-50 p-3">
              <p className="text-sm font-medium">Товар: Шлакоблок</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label>Кол-во, шт *</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(e) => {
                    const qty = e.target.value;
                    setForm({
                      ...form,
                      quantity: qty,
                      totalPrice: recalcTotal(qty, form.pricePerUnit),
                    });
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label>Цена/шт, ₽ *</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.pricePerUnit}
                  onChange={(e) => {
                    const price = e.target.value;
                    setForm({
                      ...form,
                      pricePerUnit: price,
                      totalPrice: recalcTotal(form.quantity, price),
                    });
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label>Итого, ₽</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.totalPrice}
                  onChange={(e) => setForm({ ...form, totalPrice: e.target.value })}
                  className="font-semibold"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Примечание</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
            {!editing && (
              <Button
                onClick={() => handleSave(true)}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Printer className="mr-2 h-4 w-4" />
                Сохранить и печать
              </Button>
            )}
            <Button
              onClick={() => handleSave(false)}
              variant={editing ? "default" : "outline"}
              className={editing ? "bg-orange-500 hover:bg-orange-600" : ""}
            >
              {editing ? "Сохранить" : "Только сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
