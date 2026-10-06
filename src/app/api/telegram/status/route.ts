import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getTelegramStatus } from "@/lib/telegram";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const status = await getTelegramStatus();
  return NextResponse.json(status, {
    headers: { "Cache-Control": "no-store" },
  });
}
