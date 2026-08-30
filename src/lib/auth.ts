import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function requireAuth() {
  const session = await getSession();

  if (!session.isLoggedIn || !session.userId) {
    return { error: NextResponse.json({ error: "Не авторизован" }, { status: 401 }) };
  }

  return { session };
}

export async function requireAdmin() {
  const auth = await requireAuth();
  if ("error" in auth) return auth;

  const user = await prisma.user.findUnique({
    where: { id: auth.session.userId },
    select: { role: true },
  });

  if (!user || user.role !== "admin") {
    return { error: NextResponse.json({ error: "Доступ запрещён" }, { status: 403 }) };
  }

  return auth;
}
