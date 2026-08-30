import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const period = request.nextUrl.searchParams.get("period") ?? "month";

  const now = new Date();
  let from: Date;

  switch (period) {
    case "today":
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      from = new Date(now);
      from.setDate(from.getDate() - 7);
      break;
    case "year":
      from = new Date(now.getFullYear(), 0, 1);
      break;
    case "month":
    default:
      from = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: from } },
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });

  const totalRevenue = sales.reduce((s, sale) => s + sale.totalPrice, 0);
  const totalQuantity = sales.reduce((s, sale) => s + sale.quantity, 0);
  const avgCheck = sales.length ? totalRevenue / sales.length : 0;

  const byDay: Record<string, { revenue: number; quantity: number; count: number }> = {};
  for (const sale of sales) {
    const key = sale.createdAt.toISOString().slice(0, 10);
    if (!byDay[key]) byDay[key] = { revenue: 0, quantity: 0, count: 0 };
    byDay[key].revenue += sale.totalPrice;
    byDay[key].quantity += sale.quantity;
    byDay[key].count += 1;
  }

  const dailyStats = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stats]) => ({ date, ...stats }));

  const clientMap: Record<string, { carBrand: string; licensePlate: string; total: number; count: number }> = {};
  for (const sale of sales) {
    const key = sale.clientId;
    if (!clientMap[key]) {
      clientMap[key] = {
        carBrand: sale.client.carBrand,
        licensePlate: sale.client.licensePlate,
        total: 0,
        count: 0,
      };
    }
    clientMap[key].total += sale.totalPrice;
    clientMap[key].count += 1;
  }

  const topClients = Object.values(clientMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const [totalClients, totalSalesAllTime] = await Promise.all([
    prisma.client.count(),
    prisma.sale.count(),
  ]);

  return NextResponse.json({
    period,
    summary: {
      totalRevenue,
      totalQuantity,
      salesCount: sales.length,
      avgCheck,
      totalClients,
      totalSalesAllTime,
    },
    dailyStats,
    topClients,
    recentSales: sales.slice(0, 10),
  });
}
