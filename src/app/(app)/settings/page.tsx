"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, KeyRound, UserPlus, Shield, Wallet, FileDown } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/labels";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { todayDateString } from "@/lib/dates";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { LabeledSelect } from "@/components/ui/labeled-select";
import { ROLE_LABELS } from "@/lib/constants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UserRow {
  id: string;
  username: string;
  displayName: string;
  role: string;
  createdAt: string;
  _count: { sales: number };
}

export default function SettingsPage() {
  const [userName, setUserName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetUser, setResetUser] = useState<UserRow | null>(null);
  const [newUserForm, setNewUserForm] = useState({
    username: "",
    displayName: "",
    password: "",
    role: "operator",
  });
  const [resetPassword, setResetPassword] = useState("");
  const [userMsg, setUserMsg] = useState("");
  const [userError, setUserError] = useState("");

  const [openingBalance, setOpeningBalance] = useState("");
  const [cashBalance, setCashBalance] = useState<number | null>(null);
  const [financeMsg, setFinanceMsg] = useState("");
  const [financeError, setFinanceError] = useState("");
  const [financeLoading, setFinanceLoading] = useState(false);

  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [exportLoading, setExportLoading] = useState(false);

  const load = useCallback(async () => {
    const [meRes, financeRes] = await Promise.all([
      fetch("/api/auth/me"),
      fetch("/api/finance"),
    ]);
    const me = await meRes.json();
    setUserName(me.user?.displayName ?? "");
    setIsAdmin(me.user?.role === "admin");

    if (financeRes.ok) {
      const finance = await financeRes.json();
      setOpeningBalance(String(finance.openingBalance ?? 0));
      setCashBalance(finance.cashBalance ?? null);
    }

    if (me.user?.role === "admin") {
      const usersRes = await fetch("/api/users");
      if (usersRes.ok) {
        setUsers(await usersRes.json());
      }
    }

    setLoading(false);
    const today = todayDateString();
    setExportFrom(today.slice(0, 8) + "01");
    setExportTo(today);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg("");
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError("Пароли не совпадают");
      return;
    }

    setPasswordLoading(true);
    const res = await fetch("/api/auth/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setPasswordLoading(false);

    if (res.ok) {
      setPasswordMsg("Пароль успешно изменён");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setPasswordError(data.error || "Ошибка смены пароля");
    }
  }

  async function handleAddUser() {
    setUserMsg("");
    setUserError("");

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUserForm),
    });
    const data = await res.json();

    if (res.ok) {
      setAddOpen(false);
      setNewUserForm({ username: "", displayName: "", password: "", role: "operator" });
      setUserMsg(`Пользователь ${data.displayName} добавлен`);
      load();
    } else {
      setUserError(data.error || "Ошибка создания");
    }
  }

  async function handleResetPassword() {
    if (!resetUser) return;
    setUserMsg("");
    setUserError("");

    const res = await fetch(`/api/users/${resetUser.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: resetPassword }),
    });
    const data = await res.json();

    if (res.ok) {
      setResetOpen(false);
      setResetPassword("");
      setResetUser(null);
      setUserMsg(`Пароль пользователя ${resetUser.displayName} изменён`);
    } else {
      setUserError(data.error || "Ошибка");
    }
  }

  async function handleSaveOpeningBalance(e: React.FormEvent) {
    e.preventDefault();
    setFinanceMsg("");
    setFinanceError("");
    setFinanceLoading(true);

    const res = await fetch("/api/finance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openingBalance: Number(openingBalance) || 0 }),
    });
    const data = await res.json();
    setFinanceLoading(false);

    if (res.ok) {
      setFinanceMsg("Начальный остаток сохранён");
      load();
    } else {
      setFinanceError(data.error || "Ошибка сохранения");
    }
  }

  async function handleExport(allTime: boolean) {
    setExportLoading(true);
    const params = new URLSearchParams();
    if (!allTime && exportFrom && exportTo) {
      params.set("from", exportFrom);
      params.set("to", exportTo);
    }
    const res = await fetch(`/api/export?${params}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ??
        "shlakoblok_export.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    }
    setExportLoading(false);
  }

  async function handleDeleteUser(id: string, name: string) {
    if (!confirm(`Удалить пользователя ${name}?`)) return;

    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setUserMsg(`Пользователь ${name} удалён`);
      load();
    } else {
      const data = await res.json();
      setUserError(data.error || "Ошибка удаления");
    }
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-zinc-500">Загрузка...</div>;
  }

  return (
    <div>
      <PageHeader
        title="Настройки"
        description="Пароль, касса, экспорт и пользователи"
        userName={userName}
      />

      {userMsg && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          {userMsg}
        </div>
      )}
      {userError && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {userError}
        </div>
      )}

      {financeMsg && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          {financeMsg}
        </div>
      )}
      {financeError && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {financeError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileDown className="h-4 w-4 text-orange-500" />
              Экспорт в Excel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-500">
              Скачать все данные программы: продажи, расходы, клиенты, погашения долга,
              пользователи и сводку.
            </p>
            <DateRangeFilter
              from={exportFrom}
              to={exportTo}
              onFromChange={setExportFrom}
              onToChange={setExportTo}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => handleExport(false)}
                disabled={exportLoading || !exportFrom || !exportTo}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <FileDown className="mr-2 h-4 w-4" />
                Скачать за период
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport(true)}
                disabled={exportLoading}
              >
                Скачать всё
              </Button>
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4 text-orange-500" />
                Начальный остаток кассы
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveOpeningBalance} className="space-y-4">
                <p className="text-sm text-zinc-500">
                  Сумма в кассе на начало работы. Текущий остаток считается так:
                  начальный остаток + оплаченные продажи, предоплаты и погашения долга − расходы.
                </p>
                {cashBalance !== null && (
                  <p className="rounded-lg bg-zinc-50 px-3 py-2 text-sm">
                    Сейчас в кассе:{" "}
                    <span className="font-semibold">{formatCurrency(cashBalance)}</span>
                  </p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="openingBalance">Начальный остаток, сум</Label>
                  <Input
                    id="openingBalance"
                    type="number"
                    min={0}
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="bg-orange-500 hover:bg-orange-600"
                  disabled={financeLoading}
                >
                  Сохранить остаток
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-orange-500" />
              Смена пароля
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label>Текущий пароль</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Новый пароль</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Подтверждение пароля</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
              {passwordMsg && <p className="text-sm text-green-600">{passwordMsg}</p>}
              <Button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600"
                disabled={passwordLoading}
              >
                Сменить пароль
              </Button>
            </form>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserPlus className="h-4 w-4 text-orange-500" />
                Пользователи
              </CardTitle>
              <Button
                size="sm"
                onClick={() => setAddOpen(true)}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Plus className="mr-1 h-4 w-4" />
                Добавить
              </Button>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <p className="text-sm text-zinc-500">Пользователей нет</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Имя</TableHead>
                      <TableHead>Логин</TableHead>
                      <TableHead>Роль</TableHead>
                      <TableHead className="w-24">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.displayName}</TableCell>
                        <TableCell className="font-mono text-sm">{user.username}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                            {user.role === "admin" ? (
                              <span className="flex items-center gap-1">
                                <Shield className="h-3 w-3" /> Админ
                              </span>
                            ) : (
                              "Оператор"
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Сменить пароль"
                              onClick={() => {
                                setResetUser(user);
                                setResetPassword("");
                                setResetOpen(true);
                              }}
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Удалить"
                              onClick={() => handleDeleteUser(user.id, user.displayName)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый пользователь</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Имя *</Label>
              <Input
                value={newUserForm.displayName}
                onChange={(e) =>
                  setNewUserForm({ ...newUserForm, displayName: e.target.value })
                }
                placeholder="Иван Петров"
              />
            </div>
            <div className="grid gap-2">
              <Label>Логин *</Label>
              <Input
                value={newUserForm.username}
                onChange={(e) =>
                  setNewUserForm({ ...newUserForm, username: e.target.value })
                }
                placeholder="ivan"
                className="font-mono"
              />
            </div>
            <div className="grid gap-2">
              <Label>Пароль *</Label>
              <Input
                type="password"
                value={newUserForm.password}
                onChange={(e) =>
                  setNewUserForm({ ...newUserForm, password: e.target.value })
                }
                minLength={6}
              />
            </div>
            <div className="grid gap-2">
              <Label>Роль</Label>
              <LabeledSelect
                value={newUserForm.role}
                onValueChange={(value) => setNewUserForm({ ...newUserForm, role: value })}
                options={[
                  { value: "operator", label: ROLE_LABELS.operator },
                  { value: "admin", label: ROLE_LABELS.admin },
                ]}
                triggerClassName="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Отмена</Button>
            <Button onClick={handleAddUser} className="bg-orange-500 hover:bg-orange-600">
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Сменить пароль: {resetUser?.displayName}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label>Новый пароль</Label>
            <Input
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              minLength={6}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>Отмена</Button>
            <Button onClick={handleResetPassword} className="bg-orange-500 hover:bg-orange-600">
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
