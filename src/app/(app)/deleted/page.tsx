"use client";

import { useCallback, useEffect, useState } from "react";
import { RotateCcw, Trash2, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function DeletedPage() {
  const [userName, setUserName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [records, setRecords] = useState<DeletedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const [delRes, meRes] = await Promise.all([
      fetch("/api/deleted"),
      fetch("/api/auth/me"),
    ]);
    setRecords(await delRes.json());
    const me = await meRes.json();
    setUserName(me.user?.displayName ?? "");
    setIsAdmin(me.user?.role === "admin");
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRestore(id: string) {
    const res = await fetch("/api/deleted", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "restore" }),
    });
    if (res.ok) {
      setMsg("Запись восстановлена");
      load();
    }
  }

  async function handlePurge(id: string) {
    if (!confirm("Удалить без возможности восстановления?")) return;
    const res = await fetch(`/api/deleted?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setMsg("Запись окончательно удалена");
      load();
    }
  }

  async function handlePurgeAll() {
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
        title="Удалённые данные"
        description="Восстановление и окончательная очистка"
        userName={userName}
        action={
          isAdmin && records.length > 0 ? (
            <Button variant="destructive" size="sm" onClick={handlePurgeAll}>
              <Trash2 className="mr-2 h-4 w-4" />
              Очистить всё
            </Button>
          ) : undefined
        }
      />

      {msg && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{msg}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-orange-500" />
            Корзина ({records.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-zinc-500">Удалённых записей нет</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Тип</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead>Удалено</TableHead>
                  <TableHead>Кто удалил</TableHead>
                  <TableHead className="w-28">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
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
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Восстановить"
                          onClick={() => handleRestore(r.id)}
                        >
                          <RotateCcw className="h-4 w-4 text-green-600" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Удалить навсегда"
                            onClick={() => handlePurge(r.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
