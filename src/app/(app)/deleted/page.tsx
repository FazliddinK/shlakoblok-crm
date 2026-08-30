"use client";

import { useCallback, useEffect, useState } from "react";
import { RotateCcw, Trash2, ShieldAlert, History } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/labels";
import { ENTITY_LABELS, type EntityType } from "@/lib/constants";

interface DeletedRecord {
  id: string;
  entityType: EntityType;
  label: string;
  deletedAt: string;
  deletedBy: { displayName: string; username: string };
}

interface ChangeRecord {
  id: string;
  entityType: EntityType;
  label: string;
  changedAt: string;
  changedBy: { displayName: string; username: string };
}

export default function DeletedPage() {
  const [userName, setUserName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleted, setDeleted] = useState<DeletedRecord[]>([]);
  const [changes, setChanges] = useState<ChangeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [delRes, meRes] = await Promise.all([
      fetch("/api/deleted"),
      fetch("/api/auth/me"),
    ]);
    const data = await delRes.json();
    setDeleted(data.deleted ?? []);
    setChanges(data.changes ?? []);
    const me = await meRes.json();
    setUserName(me.user?.displayName ?? "");
    setIsAdmin(me.user?.role === "admin");
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRestoreDeleted(id: string) {
    if (!isAdmin) return;
    setMsg("");
    setError("");
    const res = await fetch("/api/deleted", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "restore", type: "deleted" }),
    });
    if (res.ok) {
      setMsg("Удалённая запись восстановлена");
      load();
    } else {
      const data = await res.json();
      setError(data.error || "Ошибка восстановления");
    }
  }

  async function handleRestoreChange(id: string) {
    if (!isAdmin) return;
    setMsg("");
    setError("");
    const res = await fetch("/api/deleted", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "restore", type: "change" }),
    });
    if (res.ok) {
      setMsg("Изменение отменено, данные восстановлены");
      load();
    } else {
      const data = await res.json();
      setError(data.error || "Ошибка отката");
    }
  }

  async function handlePurge(id: string) {
    if (!isAdmin) return;
    if (!confirm("Удалить без возможности восстановления?")) return;
    const res = await fetch(`/api/deleted?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setMsg("Запись окончательно удалена");
      load();
    }
  }

  async function handlePurgeAll() {
    if (!isAdmin) return;
    if (!confirm("Очистить все удалённые данные без восстановления?")) return;
    const res = await fetch("/api/deleted", { method: "DELETE" });
    if (res.ok) {
      setMsg("Корзина очищена");
      load();
    }
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-zinc-500">Загрузка...</div>;
  }

  return (
    <div>
      <PageHeader
        title="Изменения и удалённые"
        description={
          isAdmin
            ? "История изменений и удалённых записей. Восстановление — только для администратора."
            : "История изменений и удалённых записей. Восстановление доступно администратору."
        }
        userName={userName}
        action={
          isAdmin && deleted.length > 0 ? (
            <Button variant="destructive" size="sm" onClick={handlePurgeAll}>
              <Trash2 className="mr-2 h-4 w-4" />
              Очистить удалённые
            </Button>
          ) : undefined
        }
      />

      {msg && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{msg}</div>
      )}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <Tabs defaultValue="changes">
        <TabsList className="mb-4">
          <TabsTrigger value="changes">
            Изменения ({changes.length})
          </TabsTrigger>
          <TabsTrigger value="deleted">
            Удалённые ({deleted.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="changes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4 text-orange-500" />
                Журнал изменений
              </CardTitle>
            </CardHeader>
            <CardContent>
              {changes.length === 0 ? (
                <p className="text-sm text-zinc-500">Изменений пока нет</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Тип</TableHead>
                      <TableHead>Что изменено</TableHead>
                      <TableHead>Когда</TableHead>
                      <TableHead>Оператор</TableHead>
                      {isAdmin && <TableHead className="w-20">Действие</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {changes.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {ENTITY_LABELS[r.entityType] ?? r.entityType}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md text-sm">{r.label}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {formatDateTime(r.changedAt)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{r.changedBy.displayName}</p>
                            <p className="text-xs text-zinc-400">{r.changedBy.username}</p>
                          </div>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Отменить изменение"
                              onClick={() => handleRestoreChange(r.id)}
                            >
                              <RotateCcw className="h-4 w-4 text-green-600" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deleted">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldAlert className="h-4 w-4 text-orange-500" />
                Удалённые записи
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deleted.length === 0 ? (
                <p className="text-sm text-zinc-500">Удалённых записей нет</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Тип</TableHead>
                      <TableHead>Описание</TableHead>
                      <TableHead>Удалено</TableHead>
                      <TableHead>Кто удалил</TableHead>
                      {isAdmin && <TableHead className="w-28">Действия</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deleted.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {ENTITY_LABELS[r.entityType] ?? r.entityType}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{r.label}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {formatDateTime(r.deletedAt)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{r.deletedBy.displayName}</p>
                            <p className="text-xs text-zinc-400">{r.deletedBy.username}</p>
                          </div>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Восстановить"
                                onClick={() => handleRestoreDeleted(r.id)}
                              >
                                <RotateCcw className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Удалить навсегда"
                                onClick={() => handlePurge(r.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
