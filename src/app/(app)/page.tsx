import Link from "next/link";
import { ShoppingCart, Users, BarChart3, TrendingUp, Package, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { formatCurrency, formatDateTime } from "@/lib/labels";

export default async function DashboardPage() {
  const session = await getSession();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [monthSales, totalClients, recentSales] = await Promise.all([
    prisma.sale.findMany({ where: { createdAt: { gte: monthStart } } }),
    prisma.client.count(),
    prisma.sale.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { client: true, user: { select: { displayName: true } } },
    }),
  ]);

  const monthRevenue = monthSales.reduce((s, sale) => s + sale.totalPrice, 0);
  const monthQuantity = monthSales.reduce((s, sale) => s + sale.quantity, 0);

  const stats = [
    {
      title: "Выручка за месяц",
      value: formatCurrency(monthRevenue),
      sub: `${monthSales.length} продаж`,
      icon: TrendingUp,
      href: "/reports",
    },
    {
      title: "Продано блоков",
      value: monthQuantity.toLocaleString("ru-RU"),
      sub: "за текущий месяц",
      icon: Package,
      href: "/reports",
    },
    {
      title: "Клиенты",
      value: totalClients.toString(),
      sub: "в базе",
      icon: Users,
      href: "/clients",
    },
    {
      title: "Новая продажа",
      value: "→",
      sub: "Оформить и напечатать чек",
      icon: ShoppingCart,
      href: "/sales",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Дашборд"
        description="Обзор продаж шлакоблоков"
        userName={session.displayName}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ title, value, sub, icon: Icon, href }) => (
          <Link key={title} href={href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-500">{title}</CardTitle>
                <Icon className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-zinc-500">{sub}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Последние продажи</CardTitle>
          <Link
            href="/sales"
            className="inline-flex h-7 items-center gap-1 rounded-lg px-2.5 text-[0.8rem] font-medium text-zinc-600 hover:bg-zinc-100"
          >
            Все <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {recentSales.length === 0 ? (
            <p className="text-sm text-zinc-500">Продаж пока нет</p>
          ) : (
            <ul className="space-y-3">
              {recentSales.map((sale) => (
                <li
                  key={sale.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {sale.client.carBrand} · {sale.client.licensePlate}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {sale.quantity} шт · {formatDateTime(sale.createdAt)}
                    </p>
                  </div>
                  <div className="ml-3 flex shrink-0 flex-col items-end gap-1">
                    <Badge variant="secondary">{sale.user.displayName}</Badge>
                    <span className="text-xs font-medium">
                      {formatCurrency(sale.totalPrice)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
