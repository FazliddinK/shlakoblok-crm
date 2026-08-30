"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  BarChart3,
  Settings,
  Menu,
  Blocks,
  Wallet,
  Trash2,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { href: "/", label: "Дашборд", icon: LayoutDashboard },
  { href: "/sales", label: "Продажи", icon: ShoppingCart },
  { href: "/expenses", label: "Расходы", icon: Wallet },
  { href: "/clients", label: "Клиенты", icon: Users },
  { href: "/reports", label: "Отчёты", icon: BarChart3 },
  { href: "/deleted", label: "Удалённые", icon: Trash2 },
  { href: "/settings", label: "Настройки", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-orange-500 text-white shadow-sm"
                : "text-zinc-300 hover:bg-zinc-800 hover:text-white",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ userName }: { userName: string }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-zinc-950 text-white lg:flex">
      <div className="flex items-center gap-3 border-b border-zinc-800 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500">
          <Blocks className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-wide">SHLAKOBLOK</p>
          <p className="text-xs text-zinc-400">CRM</p>
        </div>
      </div>
      <div className="flex-1 px-4 py-6">
        <NavLinks />
      </div>
      <div className="border-t border-zinc-800 px-4 py-4">
        <p className="mb-2 truncate px-3 text-xs text-zinc-400">{userName}</p>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </button>
      </div>
    </aside>
  );
}

export function MobileNav({ userName }: { userName: string }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <Sheet>
      <SheetTrigger className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted lg:hidden">
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-64 bg-zinc-950 p-0 text-white">
        <div className="flex items-center gap-3 border-b border-zinc-800 px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500">
            <Blocks className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-wide">SHLAKOBLOK</p>
            <p className="text-xs text-zinc-400">CRM</p>
          </div>
        </div>
        <div className="px-4 py-6">
          <NavLinks />
        </div>
        <div className="border-t border-zinc-800 px-4 py-4">
          <p className="mb-2 truncate px-3 text-xs text-zinc-400">{userName}</p>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
