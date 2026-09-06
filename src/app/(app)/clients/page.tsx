"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Banknote,
  FileSpreadsheet,
} from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/labels";
import { todayDateString } from "@/lib/dates";

interface ClientRow {
  id: string;
  carBrand: string;
  licensePlate: string;
  phone: string;
  notes?: string;
  balance: number;
  _count: { sales: number };
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [userName, setUserName] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [form, setForm] = useState({
    carBrand: "",
    licensePlate: "",
    phone: "",
    notes: "",
  });

  const [repayOpen, setRepayOpen] = useState(false);
  const [repayClient, setRepayClient] = useState<ClientRow | null>(null);
  const [repayAmount, setRepayAmount] = useState("");
  const [repayNote, setRepayNote] = useState("");
  const [repayError, setRepayError] = useState("");
  const [repayLoading, setRepayLoading] = useState(false);

  const [actOpen, setActOpen] = useState(false);
  const [actClient, setActClient] = useState<ClientRow | null>(null);
  const [actFrom, setActFrom] = useState("");
  const [actTo, setActTo] = useState(todayDateString());
  const [actLoading, setActLoading] = useState(false);

  const load = useCallback(async () => {
    const [clientsRes, meRes] = await Promise.all([
      fetch(`/api/clients?search=${encodeURIComponent(search)}`),
      fetch("/api/auth/me"),
    ]);
    setClients(await clientsRes.json());
    const me = await meRes.json();
    setUserName(me.user?.displayName ?? "");
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ carBrand: "", licensePlate: "", phone: "", notes: "" });
    setOpen(true);
  }

  function openEdit(client: ClientRow) {
    setEditing(client);
    setForm({
      carBrand: client.carBrand,
      licensePlate: client.licensePlate,
      phone: client.phone,
      notes: client.notes ?? "",
    });
    setOpen(true);
  }

  async function handleSave() {
    const url = editing ? `/api/clients/${editing.id}` : "/api/clients";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setOpen(false);
      load();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Удалить клиента и все его продажи?")) return;
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    load();
  }

  function openRepay(client: ClientRow) {
    setRepayClient(client);
    setRepayAmount(String(Math.max(0, client.balance)));
    setRepayNote("");
    setRepayError("");
    setRepayOpen(true);
  }

  async function handleRepay(full: boolean) {
    if (!repayClient) return;
    setRepayError("");
    setRepayLoading(true);
    const amount = full ? Math.max(0, repayClient.balance) : Number(repayAmount);
    const res = await fetch(`/api/clients/${repayClient.id}/repay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, note: repayNote }),
    });
    const data = await res.json();
    setRepayLoading(false);
    if (res.ok) {
      setRepayOpen(false);
      load();
    } else {
      setRepayError(data.error || "Ошибка погашения");
    }
  }

  function openAct(client: ClientRow) {
    setActClient(client);
    const today = todayDateString();
    setActFrom(today.slice(0, 8) + "01");
    setActTo(today);
    setActOpen(true);
  }

  async function downloadAct(allTime: boolean) {
    if (!actClient) return;
    setActLoading(true);
    const params = new URLSearchParams();
    if (!allTime) {
      if (actFrom) params.set("from", actFrom);
      if (actTo) params.set("to", actTo);
    }
    const res = await fetch(
      `/api/clients/${actClient.id}/reconciliation?${params}`,
    );
    setActLoading(false);
    if (!res.ok) {
      alert("Не удалось сформировать акт сверки");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ??
      `akt_sverki_${actClient.licensePlate}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-500">
        Загрузка...
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Клиенты"
        description="Баланс, погашение долга и акт сверки"
        userName={userName}
        action={
          <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600">
            <Plus className="mr-2 h-4 w-4" />
            Добавить клиента
          </Button>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          placeholder="Поиск по марке, номеру, телефону..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {clients.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-zinc-500">
          Клиентов пока нет
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Марка авто</TableHead>
                <TableHead>Гос. номер</TableHead>
                <TableHead className="hidden sm:table-cell">Телефон</TableHead>
                <TableHead>Баланс</TableHead>
                <TableHead>Продаж</TableHead>
                <TableHead className="w-40">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.carBrand}</TableCell>
                  <TableCell className="font-mono">{client.licensePlate}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {client.phone || "—"}
                  </TableCell>
                  <TableCell>
                    {client.balance > 0 ? (
                      <span className="font-medium text-red-600">
                        Долг {formatCurrency(client.balance)}
                      </span>
                    ) : client.balance < 0 ? (
                      <span className="font-medium text-blue-600">
                        Предоплата {formatCurrency(Math.abs(client.balance))}
                      </span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>{client._count.sales}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {client.balance > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Погасить долг"
                          onClick={() => openRepay(client)}
                        >
                          <Banknote className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Акт сверки"
                        onClick={() => openAct(client)}
                      >
                        <FileSpreadsheet className="h-4 w-4 text-orange-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(client)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(client.id)}
                      >
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Редактировать клиента" : "Новый клиент"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Марка авто *</Label>
              <Input
                value={form.carBrand}
                onChange={(e) => setForm({ ...form, carBrand: e.target.value })}
                placeholder="Toyota Camry"
              />
            </div>
            <div className="grid gap-2">
              <Label>Гос. номер *</Label>
              <Input
                value={form.licensePlate}
                onChange={(e) =>
                  setForm({ ...form, licensePlate: e.target.value.toUpperCase() })
                }
                placeholder="A123BC777"
                className="font-mono uppercase"
              />
            </div>
            <div className="grid gap-2">
              <Label>Телефон</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Заметки</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {editing ? "Сохранить" : "Добавить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={repayOpen} onOpenChange={setRepayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Погашение долга клиента</DialogTitle>
          </DialogHeader>
          {repayClient && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-zinc-600">
                {repayClient.carBrand} · {repayClient.licensePlate}
              </p>
              <p className="text-sm">
                Текущий долг:{" "}
                <span className="font-semibold text-red-600">
                  {formatCurrency(Math.max(0, repayClient.balance))}
                </span>
              </p>
              <div className="grid gap-2">
                <Label>Сумма погашения, сум</Label>
                <Input
                  type="number"
                  min={1}
                  max={Math.max(0, repayClient.balance)}
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Примечание</Label>
                <Textarea
                  value={repayNote}
                  onChange={(e) => setRepayNote(e.target.value)}
                />
              </div>
              {repayError && (
                <p className="text-sm text-red-600">{repayError}</p>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRepayOpen(false)}>
              Отмена
            </Button>
            <Button
              variant="outline"
              disabled={repayLoading}
              onClick={() => handleRepay(false)}
            >
              Частично
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={repayLoading}
              onClick={() => handleRepay(true)}
            >
              Погасить полностью
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actOpen} onOpenChange={setActOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Акт сверки</DialogTitle>
          </DialogHeader>
          {actClient && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-zinc-600">
                {actClient.carBrand} · {actClient.licensePlate}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>С</Label>
                  <Input
                    type="date"
                    value={actFrom}
                    onChange={(e) => setActFrom(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>По</Label>
                  <Input
                    type="date"
                    value={actTo}
                    onChange={(e) => setActTo(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-zinc-500">
                Excel-файл с начислениями, оплатами и сальдо как в бухгалтерском
                акте сверки.
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setActOpen(false)}>
              Отмена
            </Button>
            <Button
              variant="outline"
              disabled={actLoading}
              onClick={() => downloadAct(true)}
            >
              Весь период
            </Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600"
              disabled={actLoading || !actFrom || !actTo}
              onClick={() => downloadAct(false)}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Скачать Excel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
