import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getFinanceSummary } from "@/lib/finance";
import { sendTelegramMessage, formatTelegramMessage, operatorFromSession } from "@/lib/telegram";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const summary = await getFinanceSummary();
  return NextResponse.json(summary);
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { openingBalance } = await request.json();
  const settings = await prisma.appSettings.upsert({
    where: { id: "default" },
    update: { openingBalance: Number(openingBalance) || 0 },
    create: { openingBalance: Number(openingBalance) || 0 },
  });

  await sendTelegramMessage(
    formatTelegramMessage(
      "изменение",
      "Начальный остаток кассы",
      `💰 ${settings.openingBalance} сум`,
      operatorFromSession(auth.session),
    ),
  );

  return NextResponse.json(settings);
}
