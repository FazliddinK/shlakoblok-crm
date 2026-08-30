"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, KeyRound, UserPlus, Shield } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const load = useCallback(async () => {
    const meRes = await fetch("/api/auth/me");
    const me = await meRes.json();
    setUserName(me.user?.displayName ?? "");
    setIsAdmin(me.user?.role === "admin");

    if (me.user?.role === "admin") {
      const usersRes = await fetch("/api/users");
      if (usersRes.ok) {
        setUsers(await usersRes.json());
      }
    }

    setLoading(false);
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
        description="Смена пароля и управление пользователями"
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

      <div className="grid gap-6 lg:grid-cols-2">
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
              <Select
                value={newUserForm.role}
                onValueChange={(v) => v && setNewUserForm({ ...newUserForm, role: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operator">Оператор</SelectItem>
                  <SelectItem value="admin">Администратор</SelectItem>
                </SelectContent>
              </Select>
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
