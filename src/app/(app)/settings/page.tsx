"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, KeyRound, UserPlus, Shield, Wallet, FileDown, Send } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/i18n-provider";
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

interface TelegramStatus {
  configured: boolean;
  botUsername?: string;
  botName?: string;
  chatId?: string;
  chatTitle?: string;
  chatType?: string;
  isBotAdmin?: boolean;
  error?: string;
}

export default function SettingsPage() {
  const { t, formatCurrency } = useI18n();
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

  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus | null>(null);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramMsg, setTelegramMsg] = useState("");
  const [telegramError, setTelegramError] = useState("");

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
      const [usersRes, telegramRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/telegram/status"),
      ]);
      if (usersRes.ok) {
        setUsers(await usersRes.json());
      }
      if (telegramRes.ok) {
        setTelegramStatus(await telegramRes.json());
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
      setPasswordError(t("Пароли не совпадают"));
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
      setPasswordMsg(t("Пароль успешно изменён"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setPasswordError(t(data.error || "Ошибка смены пароля"));
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
      setUserMsg(`${t("Пользователь")} ${data.displayName} ${t("добавлен")}`);
      load();
    } else {
      setUserError(t(data.error || "Ошибка создания"));
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
      setUserMsg(`${t("Пароль пользователя")} ${resetUser.displayName} ${t("изменён")}`);
    } else {
      setUserError(t(data.error || "Ошибка"));
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
      setFinanceMsg(t("Начальный остаток сохранён"));
      load();
    } else {
      setFinanceError(t(data.error || "Ошибка сохранения"));
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

  async function handleTelegramTest() {
    setTelegramLoading(true);
    setTelegramMsg("");
    setTelegramError("");

    const res = await fetch("/api/telegram/test", { method: "POST" });
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      setTelegramMsg(t("Тестовое сообщение отправлено"));
      const statusRes = await fetch("/api/telegram/status");
      if (statusRes.ok) setTelegramStatus(await statusRes.json());
    } else {
      setTelegramError(t(data.error || "Не удалось отправить тестовое сообщение"));
    }

    setTelegramLoading(false);
  }

  async function handleDeleteUser(id: string, name: string) {
    if (!confirm(`${t("Удалить пользователя")} ${name}?`)) return;

    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setUserMsg(`${t("Пользователь")} ${name} ${t("удалён")}`);
      load();
    } else {
      const data = await res.json();
      setUserError(t(data.error || "Ошибка удаления"));
    }
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-zinc-500">{t("Загрузка...")}</div>;
  }

  return (
    <div>
      <PageHeader
        title={t("Настройки")}
        description={t("Пароль, касса, экспорт, Telegram и пользователи")}
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
              {t("Экспорт в Excel")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-500">
              {t("Скачать все данные программы: продажи, расходы, клиенты, погашения долга, пользователи и сводку.")}
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
                {t("Скачать за период")}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport(true)}
                disabled={exportLoading}
              >
                {t("Скачать всё")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4 text-orange-500" />
                {t("Начальный остаток кассы")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveOpeningBalance} className="space-y-4">
                <p className="text-sm text-zinc-500">
                  {t("Сумма в кассе на начало работы. Текущий остаток считается так: начальный остаток + оплаченные продажи, предоплаты и погашения долга − расходы.")}
                </p>
                {cashBalance !== null && (
                  <p className="rounded-lg bg-zinc-50 px-3 py-2 text-sm">
                    {t("Сейчас в кассе")}:{" "}
                    <span className="font-semibold">{formatCurrency(cashBalance)}</span>
                  </p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="openingBalance">{t("Начальный остаток, сум")}</Label>
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
                  {t("Сохранить остаток")}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}


        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Send className="h-4 w-4 text-orange-500" />
                {t("Уведомления Telegram")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {telegramMsg && (
                <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                  {telegramMsg}
                </div>
              )}
              {telegramError && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {telegramError}
                </div>
              )}

              {!telegramStatus?.configured ? (
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-zinc-500">{t("Статус")}:</span>{" "}
                    <Badge variant="secondary">{t("Не настроено")}</Badge>
                  </p>
                  <p className="text-zinc-500">
                    {t("Укажите TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в файле .env.")}
                  </p>
                </div>
              ) : (
                <div className="grid gap-2 text-sm">
                  <p>
                    <span className="text-zinc-500">{t("Статус")}:</span>{" "}
                    <Badge variant={telegramStatus.error ? "secondary" : "default"}>
                      {telegramStatus.error ? t("Есть ошибка") : t("Подключено")}
                    </Badge>
                  </p>
                  <p>
                    <span className="text-zinc-500">{t("Бот")}:</span>{" "}
                    <span className="font-medium">
                      {telegramStatus.botUsername ? `@${telegramStatus.botUsername}` : telegramStatus.botName || "—"}
                    </span>
                  </p>
                  {telegramStatus.botName && telegramStatus.botUsername && (
                    <p>
                      <span className="text-zinc-500">{t("Имя бота")}:</span>{" "}
                      <span className="font-medium">{telegramStatus.botName}</span>
                    </p>
                  )}
                  <p>
                    <span className="text-zinc-500">{t("Группа")}:</span>{" "}
                    <span className="font-medium">{telegramStatus.chatTitle || "—"}</span>
                  </p>
                  <p>
                    <span className="text-zinc-500">Chat ID:</span>{" "}
                    <span className="font-mono">{telegramStatus.chatId || "—"}</span>
                  </p>
                  <p>
                    <span className="text-zinc-500">{t("Бот — администратор")}:</span>{" "}
                    <Badge variant={telegramStatus.isBotAdmin ? "default" : "secondary"}>
                      {telegramStatus.isBotAdmin ? t("Да") : t("Нет")}
                    </Badge>
                  </p>
                  {telegramStatus.error && (
                    <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-800">
                      {t("Ошибка проверки Telegram")}: {telegramStatus.error}
                    </p>
                  )}
                </div>
              )}

              <Button
                type="button"
                onClick={handleTelegramTest}
                disabled={telegramLoading || !telegramStatus?.configured}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Send className="mr-2 h-4 w-4" />
                {t("Отправить тестовое сообщение")}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-orange-500" />
              {t("Смена пароля")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label>{t("Текущий пароль")}</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t("Новый пароль")}</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t("Подтверждение пароля")}</Label>
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
                {t("Сменить пароль")}
              </Button>
            </form>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserPlus className="h-4 w-4 text-orange-500" />
                {t("Пользователи")}
              </CardTitle>
              <Button
                size="sm"
                onClick={() => setAddOpen(true)}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Plus className="mr-1 h-4 w-4" />
                {t("Добавить")}
              </Button>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <p className="text-sm text-zinc-500">{t("Пользователей нет")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("Имя")}</TableHead>
                      <TableHead>{t("Логин")}</TableHead>
                      <TableHead>{t("Роль")}</TableHead>
                      <TableHead className="w-24">{t("Действия")}</TableHead>
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
                                <Shield className="h-3 w-3" /> {t("Админ")}
                              </span>
                            ) : (
                              t("Оператор")
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title={t("Сменить пароль")}
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
                              title={t("Удалить")}
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
            <DialogTitle>{t("Новый пользователь")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>{t("Имя *")}</Label>
              <Input
                value={newUserForm.displayName}
                onChange={(e) =>
                  setNewUserForm({ ...newUserForm, displayName: e.target.value })
                }
                placeholder={t("Иван Петров")}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("Логин *")}</Label>
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
              <Label>{t("Пароль *")}</Label>
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
              <Label>{t("Роль")}</Label>
              <LabeledSelect
                value={newUserForm.role}
                onValueChange={(value) => setNewUserForm({ ...newUserForm, role: value })}
                options={[
                  { value: "operator", label: t("Оператор") },
                  { value: "admin", label: t("Администратор") },
                ]}
                triggerClassName="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>{t("Отмена")}</Button>
            <Button onClick={handleAddUser} className="bg-orange-500 hover:bg-orange-600">
              {t("Создать")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("Сменить пароль")}: {resetUser?.displayName}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label>{t("Новый пароль")}</Label>
            <Input
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              minLength={6}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>{t("Отмена")}</Button>
            <Button onClick={handleResetPassword} className="bg-orange-500 hover:bg-orange-600">
              {t("Сохранить")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
