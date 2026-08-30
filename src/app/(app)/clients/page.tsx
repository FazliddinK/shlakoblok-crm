"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
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
import { formatCurrency, formatDateTime } from "@/lib/labels";
import { printReceipt, type SaleWithRelations } from "@/components/sales/receipt";

interface Client {
  id: string;
  carBrand: string;
  licensePlate: string;
  phone: string;
  balance: number;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<(Client & { _count: { sales: number } })[]>([]);
  const [userName, setUserName] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState({ carBrand: "", licensePlate: "", phone: "", notes: "" });

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

  function openEdit(client: Client & { notes?: string }) {
    setEditing(client);
    setForm({
      carBrand: client.carBrand,
      licensePlate: client.licensePlate,
      phone: client.phone,
      notes: (client as Client & { notes: string }).notes ?? "",
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

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-zinc-500">Загрузка...</div>;
  }

  return (
    <div>
      <PageHeader
        title="Клиенты"
        description="Марка авто и гос. номер"
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
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Марка авто</TableHead>
                <TableHead>Гос. номер</TableHead>
                <TableHead className="hidden sm:table-cell">Телефон</TableHead>
                <TableHead>Баланс</TableHead>
                <TableHead>Продаж</TableHead>
                <TableHead className="w-24">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.carBrand}</TableCell>
                  <TableCell className="font-mono">{client.licensePlate}</TableCell>
                  <TableCell className="hidden sm:table-cell">{client.phone || "—"}</TableCell>
                  <TableCell>
                    {client.balance > 0 ? (
                      <span className="text-red-600 font-medium">
                        Долг {formatCurrency(client.balance)}
                      </span>
                    ) : client.balance < 0 ? (
                      <span className="text-blue-600 font-medium">
                        Предопл. {formatCurrency(Math.abs(client.balance))}
                      </span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>{client._count.sales}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(client)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(client.id)}>
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
            <DialogTitle>{editing ? "Редактировать клиента" : "Новый клиент"}</DialogTitle>
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
                onChange={(e) => setForm({ ...form, licensePlate: e.target.value.toUpperCase() })}
                placeholder="А123БВ777"
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
            <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
            <Button onClick={handleSave} className="bg-orange-500 hover:bg-orange-600">
              {editing ? "Сохранить" : "Добавить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
