"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Blocks, Loader2 } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LabeledSelect } from "@/components/ui/labeled-select";

interface LoginUser {
  id: string;
  username: string;
  displayName: string;
  role: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [users, setUsers] = useState<LoginUser[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/users")
      .then((res) => res.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]));
  }, []);

  const userOptions = users.map((user) => ({
    value: user.username,
    label: `${user.displayName}${user.role === "admin" ? ` (${t("Администратор")})` : ""}`,
  }));

  const selectedUser = users.find((user) => user.username === username);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!username) {
      setError(t("Выберите пользователя"));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(t(data.error || "Неверный пароль"));
        return;
      }

      router.push("/sales");
      router.refresh();
    } catch {
      setError(t("Не удалось подключиться к серверу"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <LanguageSwitcher className="absolute right-4 top-4" />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-500">
            <Blocks className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-xl">SHLAKOBLOK CRM</CardTitle>
          <p className="text-sm text-zinc-500">{t("Вход в систему учёта продаж")}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("Пользователь")}</Label>
              <LabeledSelect
                value={username}
                onValueChange={setUsername}
                options={userOptions}
                placeholder={t("Выберите пользователя")}
                triggerClassName="w-full"
              />
              {selectedUser && (
                <p className="text-xs text-zinc-500">
                  {t("Вход как")}: <span className="font-medium">{selectedUser.displayName}</span>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("Пароль")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}
            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600"
              disabled={loading || !username}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Войти")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
