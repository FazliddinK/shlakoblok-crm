"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Printer,
  Package,
  Eye,
  History,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { LabeledSelect } from "@/components/ui/labeled-select";
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
import { SALES_PERIOD_LABELS } from "@/lib/constants";
import { todayDateString } from "@/lib/dates";
import { printReceipt, type SaleWithRelations } from "@/components/sales/receipt";

interface Client {
  id: string;
  carBrand: string;
  licensePlate: string;
  phone: string;
}

interface GoodsDeliveryRow {
  id: string;
  quantity: number;
  licensePlate: string;
  note: string;
  createdAt: string;
  user: { displayName: string };
}

interface SaleRow extends SaleWithRelations {
  debtPaid?: number;
  debtRemaining?: number;
  deliveredQuantity?: number;
  remainingQuantity?: number;
  prepaymentRemainingAmount?: number;
  goodsDeliveries?: GoodsDeliveryRow[];
}

const PERIOD_OPTIONS = Object.entries(SALES_PERIOD_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export default function SalesPage() {
  const [tab, setTab] = useState<"sales" | "pending">("sales");
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [pendingSales, setPendingSales] = useState<SaleRow[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [userName, setUserName] = useState("");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("today");
  const [customFrom, setCustomFrom] = useState(todayDateString());
  const [customTo, setCustomTo] = useState(todayDateString());
  const [periodLabel, setPeriodLabel] = useState(SALES_PERIOD_LABELS.today);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailSale, setDetailSale] = useState<SaleRow | null>(null);
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [actionSale, setActionSale] = useState<SaleRow | null>(null);
  const [deliverQty, setDeliverQty] = useState("");
  const [deliverPlate, setDeliverPlate] = useState("");
  const [deliverNote, setDeliverNote] = useState("");
  const [actionError, setActionError] = useState("");

  const [editing, setEditing] = useState<SaleRow | null>(null);
  const [mode, setMode] = useState<"existing" | "new">("new");
  const [form, setForm] = useState({
    clientId: "",
    carBrand: "",
    licensePlate: "",
    phone: "",
    quantity: "",
    pricePerUnit: "85",
    totalPrice: "",
    paidAmount: "",
    notes: "",
    initialDeliveryQuantity: "",
    initialDeliveryPlate: "",
  });

  const clientOptions = useMemo(
    () =>
      clients.map((client) => ({
        value: client.id,
        label: `${client.carBrand} · ${client.licensePlate}`,
      })),
    [clients],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ search, period });
    if (period === "custom") {
      params.set("from", customFrom);
      params.set("to", customTo);
    }

    const [salesRes, pendingRes, clientsRes, meRes] = await Promise.all([
      fetch(`/api/sales?${params}`),
      fetch(`/api/sales?pending=1&search=${encodeURIComponent(search)}`),
      fetch("/api/clients"),
      fetch("/api/auth/me"),
    ]);

    const salesData = await salesRes.json();
    setSales(salesData.sales ?? []);
    setPeriodLabel(salesData.periodLabel ?? SALES_PERIOD_LABELS.today);
    setPendingSales((await pendingRes.json()).sales ?? []);
    setClients(await clientsRes.json());
    const me = await meRes.json();
    setUserName(me.user?.displayName ?? "");
    setLoading(false);
  }, [search, period, customFrom, customTo]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  function onPlateChange(plate: string) {
    const upper = plate.toUpperCase();
    const found = clients.find((client) => client.licensePlate === upper);
    setForm((current) => ({
      ...current,
      licensePlate: upper,
      carBrand: found?.carBrand ?? current.carBrand,
      phone: found?.phone ?? current.phone,
      clientId: found?.id ?? "",
      initialDeliveryPlate: upper || current.initialDeliveryPlate,
    }));
  }

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
      paidAmount: "",
      notes: "",
      initialDeliveryQuantity: "",
      initialDeliveryPlate: "",
    });
    setOpen(true);
  }

  function openEdit(sale: SaleRow) {
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
      paidAmount: String(sale.paidAmount ?? sale.totalPrice),
      initialDeliveryQuantity: "",
      initialDeliveryPlate: sale.client.licensePlate,
    });
    setOpen(true);
  }

  function openDetails(sale: SaleRow) {
    setDetailSale(sale);
    setDetailOpen(true);
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
          paidAmount: Number(form.paidAmount),
          notes: form.notes,
        }
      : {
          clientId: mode === "existing" ? form.clientId : undefined,
          carBrand: form.carBrand || undefined,
          licensePlate: form.licensePlate || undefined,
          phone: form.phone || undefined,
          quantity: Number(form.quantity),
          pricePerUnit: Number(form.pricePerUnit),
          totalPrice: total,
          paidAmount: Number(form.paidAmount),
          notes: form.notes,
          initialDeliveryQuantity:
            form.initialDeliveryQuantity === ""
              ? undefined
              : Number(form.initialDeliveryQuantity),
          initialDeliveryPlate: form.initialDeliveryPlate || undefined,
        };

    const res = await fetch(editing ? `/api/sales/${editing.id}` : "/api/sales", {
      method: editing ? "PUT" : "POST",
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

  async function handleDeliver() {
    if (!actionSale) return;
    setActionError("");
    const res = await fetch(`/api/sales/${actionSale.id}/deliver`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quantity: Number(deliverQty),
        licensePlate: deliverPlate,
        note: deliverNote,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setDeliverOpen(false);
      load();
    } else {
      setActionError(data.error || "Ошибка выдачи");
    }
  }

  async function handleDeleteDelivery(saleId: string, deliveryId: string) {
    if (!confirm("Удалить запись выдачи?")) return;
    await fetch(`/api/sales/${saleId}/deliver/${deliveryId}`, { method: "DELETE" });
    load();
    if (detailSale?.id === saleId) {
      const res = await fetch(`/api/sales/${saleId}`);
      if (res.ok) setDetailSale(await res.json());
    }
  }

  function renderPendingTable(items: SaleRow[]) {
    if (items.length === 0) {
      return (
        <div className="rounded-lg border border-dashed p-12 text-center text-zinc-500">
          Нет продаж с не выданным товаром.
        </div>
      );
    }

    return (
      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Клиент</TableHead>
              <TableHead>Гос. номер</TableHead>
              <TableHead>Куплено</TableHead>
              <TableHead>Выдано</TableHead>
              <TableHead>Осталось</TableHead>
              <TableHead>Цена/шт</TableHead>
              <TableHead>Остаток предоплаты</TableHead>
              <TableHead>Дата оплаты</TableHead>
              <TableHead className="w-24">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell className="font-medium">{sale.client.carBrand}</TableCell>
                <TableCell className="font-mono">{sale.client.licensePlate}</TableCell>
                <TableCell>{sale.quantity} шт</TableCell>
                <TableCell>{sale.deliveredQuantity ?? 0} шт</TableCell>
                <TableCell className="font-medium text-orange-600">
                  {sale.remainingQuantity ?? 0} шт
                </TableCell>
                <TableCell>{formatCurrency(sale.pricePerUnit)}</TableCell>
                <TableCell className="font-semibold text-blue-600">
                  {formatCurrency(sale.prepaymentRemainingAmount ?? 0)}
                </TableCell>
                <TableCell className="text-xs whitespace-nowrap">
                  {formatDateTime(sale.createdAt)}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600"
                    onClick={() => {
                      setActionSale(sale);
                      setDeliverQty(String(sale.remainingQuantity));
                      setDeliverPlate(sale.client.licensePlate);
                      setDeliverNote("");
                      setActionError("");
                      setDeliverOpen(true);
                    }}
                  >
                    <Package className="mr-1 h-4 w-4" />
                    Выдать
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  function renderSalesTable(items: SaleRow[], showPeriodInfo = false) {
    if (items.length === 0) {
      return (
        <div className="rounded-lg border border-dashed p-12 text-center text-zinc-500">
          {showPeriodInfo
            ? `Продаж за период «${periodLabel}» пока нет.`
            : "Нет продаж с не выданным товаром."}
        </div>
      );
    }

    return (
      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Дата</TableHead>
              <TableHead>Клиент</TableHead>
              <TableHead className="hidden md:table-cell">Гос. номер</TableHead>
              <TableHead>Куплено</TableHead>
              <TableHead>Выдано</TableHead>
              <TableHead>Осталось</TableHead>
              <TableHead>Итого</TableHead>
              <TableHead className="w-40">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell className="text-xs whitespace-nowrap">
                  {formatDateTime(sale.createdAt)}
                </TableCell>
                <TableCell className="font-medium">{sale.client.carBrand}</TableCell>
                <TableCell className="hidden md:table-cell font-mono">
                  {sale.client.licensePlate}
                </TableCell>
                <TableCell>{sale.quantity} шт</TableCell>
                <TableCell>{sale.deliveredQuantity ?? sale.quantity} шт</TableCell>
                <TableCell>
                  {sale.paymentType === "prepayment" && (sale.remainingQuantity ?? 0) > 0 ? (
                    <span className="font-medium text-orange-600">
                      {sale.remainingQuantity} шт
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="font-semibold">
                  {formatCurrency(sale.totalPrice)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {(sale.remainingQuantity ?? 0) > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Выдать товар"
                        onClick={() => {
                          setActionSale(sale);
                          setDeliverQty(String(sale.remainingQuantity));
                          setDeliverPlate(sale.client.licensePlate);
                          setDeliverNote("");
                          setActionError("");
                          setDeliverOpen(true);
                        }}
                      >
                        <Package className="h-4 w-4 text-orange-600" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" title="Детали" onClick={() => openDetails(sale)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Печать" onClick={() => printReceipt(sale)}>
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
    );
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-zinc-500">Загрузка...</div>;
  }

  return (
    <div>
      <PageHeader
        title="Продажи"
        description="Оформление продаж и выдача предоплаченного товара"
        userName={userName}
        action={
          <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600">
            <Plus className="mr-2 h-4 w-4" />
            Новая продажа
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(value) => setTab(value as "sales" | "pending")}>
        <TabsList className="mb-4">
          <TabsTrigger value="sales">Реестр продаж</TabsTrigger>
          <TabsTrigger value="pending">
            Остатки клиентов ({pendingSales.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <div className="flex flex-col gap-4 rounded-lg border bg-white p-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-700">Период: {periodLabel}</p>
              <p className="text-xs text-zinc-500">Показаны продажи только за выбранный период</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="grid gap-1">
                <Label className="text-xs text-zinc-500">Период</Label>
                <LabeledSelect
                  value={period}
                  onValueChange={setPeriod}
                  options={PERIOD_OPTIONS}
                  triggerClassName="w-48"
                />
              </div>
              {period === "custom" && (
                <DateRangeFilter
                  from={customFrom}
                  to={customTo}
                  onFromChange={setCustomFrom}
                  onToChange={setCustomTo}
                />
              )}
            </div>
          </div>

          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Поиск по марке или номеру..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {renderSalesTable(sales, true)}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <div className="rounded-lg border bg-orange-50 p-4 text-sm text-orange-900">
            Здесь показаны предоплаченные продажи, по которым клиенту ещё не выдан весь товар.
            Это товарный остаток, отдельно от денежного долга клиента.
          </div>
          {renderPendingTable(pendingSales)}
        </TabsContent>
      </Tabs>

      <Dialog open={deliverOpen} onOpenChange={setDeliverOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Выдача товара</DialogTitle>
          </DialogHeader>
          {actionSale && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-zinc-600">
                {actionSale.client.carBrand} · куплено {actionSale.quantity} шт, осталось{" "}
                {actionSale.remainingQuantity} шт
              </p>
              <div className="grid gap-2">
                <Label>Количество, шт</Label>
                <Input
                  type="number"
                  min={1}
                  max={actionSale.remainingQuantity}
                  value={deliverQty}
                  onChange={(e) => setDeliverQty(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Гос. номер автомобиля</Label>
                <Input
                  value={deliverPlate}
                  onChange={(e) => setDeliverPlate(e.target.value.toUpperCase())}
                  className="font-mono uppercase"
                />
              </div>
              <div className="grid gap-2">
                <Label>Комментарий</Label>
                <Textarea value={deliverNote} onChange={(e) => setDeliverNote(e.target.value)} />
              </div>
              {actionError && <p className="text-sm text-red-600">{actionError}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeliverOpen(false)}>Отмена</Button>
            <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleDeliver}>
              Выдать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Детали продажи
            </DialogTitle>
          </DialogHeader>
          {detailSale && (
            <div className="space-y-4 py-2">
              <div className="grid gap-2 rounded-lg bg-zinc-50 p-4 text-sm sm:grid-cols-2">
                <p><span className="text-zinc-500">Клиент:</span> {detailSale.client.carBrand}</p>
                <p><span className="text-zinc-500">Гос. номер:</span> {detailSale.client.licensePlate}</p>
                <p><span className="text-zinc-500">Оплачено:</span> {formatCurrency(detailSale.paidAmount ?? detailSale.totalPrice)}</p>
                <p><span className="text-zinc-500">Куплено:</span> {detailSale.quantity} шт</p>
                <p><span className="text-zinc-500">Выдано:</span> {detailSale.deliveredQuantity ?? 0} шт</p>
                <p><span className="text-zinc-500">Осталось:</span> {detailSale.remainingQuantity ?? 0} шт</p>
                <p><span className="text-zinc-500">Цена/шт:</span> {formatCurrency(detailSale.pricePerUnit)}</p>
                <p><span className="text-zinc-500">Сумма продажи:</span> {formatCurrency(detailSale.totalPrice)}</p>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium">История выдач</h3>
                {(detailSale.goodsDeliveries?.length ?? 0) === 0 ? (
                  <p className="text-sm text-zinc-500">Выдач пока нет</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Дата</TableHead>
                        <TableHead>Кол-во</TableHead>
                        <TableHead>Гос. номер</TableHead>
                        <TableHead>Оператор</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailSale.goodsDeliveries?.map((delivery) => (
                        <TableRow key={delivery.id}>
                          <TableCell className="text-xs">{formatDateTime(delivery.createdAt)}</TableCell>
                          <TableCell>{delivery.quantity} шт</TableCell>
                          <TableCell className="font-mono">{delivery.licensePlate}</TableCell>
                          <TableCell>{delivery.user.displayName}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteDelivery(detailSale.id, delivery.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-[72rem] overflow-y-auto sm:max-w-[72rem]">
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
                <LabeledSelect
                  value={form.clientId}
                  onValueChange={(value) => {
                    const client = clients.find((item) => item.id === value);
                    setForm({
                      ...form,
                      clientId: value,
                      carBrand: client?.carBrand ?? form.carBrand,
                      licensePlate: client?.licensePlate ?? form.licensePlate,
                      phone: client?.phone ?? form.phone,
                      initialDeliveryPlate: client?.licensePlate ?? form.initialDeliveryPlate,
                    });
                  }}
                  options={clientOptions}
                  placeholder="Выберите клиента"
                  triggerClassName="w-full"
                />
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
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
                      onChange={(e) => onPlateChange(e.target.value)}
                      list="plates-list"
                      className="font-mono uppercase"
                      disabled={!!editing}
                    />
                    <datalist id="plates-list">
                      {clients.map((client) => (
                        <option key={client.id} value={client.licensePlate}>
                          {client.carBrand}
                        </option>
                      ))}
                    </datalist>
                  </div>
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Кол-во, шт *</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(e) => {
                    const qty = e.target.value;
                    const total = recalcTotal(qty, form.pricePerUnit);
                    setForm({
                      ...form,
                      quantity: qty,
                      totalPrice: total,
                      paidAmount: editing ? form.paidAmount : (form.paidAmount || total),
                    });
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label>Цена/шт, сум *</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.pricePerUnit}
                  onChange={(e) => {
                    const price = e.target.value;
                    const total = recalcTotal(form.quantity, price);
                    setForm({
                      ...form,
                      pricePerUnit: price,
                      totalPrice: total,
                      paidAmount: editing ? form.paidAmount : (form.paidAmount || total),
                    });
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label>Итого, сум</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.totalPrice}
                  onChange={(e) => setForm({ ...form, totalPrice: e.target.value })}
                  className="font-semibold"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Реально оплаченная сумма, сум *</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.paidAmount}
                  onChange={(e) => setForm({ ...form, paidAmount: e.target.value })}
                  placeholder="Сколько клиент заплатил сейчас"
                  className="font-semibold"
                  required
                />
                <p className="text-xs text-zinc-500">
                  Это приход денег в кассу. Долг или предоплата считаются в карточке клиента.
                </p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3 text-sm">
                <p>Итого по товару: <b>{form.totalPrice || "0"} сум</b></p>
                <p className="mt-1">
                  {Number(form.paidAmount || 0) < Number(form.totalPrice || 0)
                    ? `Долг клиента: ${Number(form.totalPrice || 0) - Number(form.paidAmount || 0)} сум`
                    : Number(form.paidAmount || 0) > Number(form.totalPrice || 0)
                      ? `Предоплата/переплата: ${Number(form.paidAmount || 0) - Number(form.totalPrice || 0)} сум`
                      : "Оплачено полностью"}
                </p>
              </div>
            </div>

            {!editing && (
              <div className="grid gap-4 rounded-lg border border-orange-200 bg-orange-50 p-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <p className="text-sm font-medium text-orange-900">
                    Выдача товара сейчас (необязательно)
                  </p>
                  <p className="text-xs text-orange-800">
                    Если оставить пустым — при долге выдаётся весь товар, при полной оплате тоже весь.
                    Укажите меньше купленного, если клиент забирает частями (остаток — во вкладке «Остатки клиентов»).
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>Выдать сейчас, шт</Label>
                  <Input
                    type="number"
                    min={0}
                    max={Number(form.quantity) || undefined}
                    value={form.initialDeliveryQuantity}
                    onChange={(e) =>
                      setForm({ ...form, initialDeliveryQuantity: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Гос. номер при выдаче</Label>
                  <Input
                    value={form.initialDeliveryPlate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        initialDeliveryPlate: e.target.value.toUpperCase(),
                      })
                    }
                    className="font-mono uppercase"
                  />
                </div>
              </div>
            )}

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
