import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
    },
    orderBy: { displayName: "asc" },
  });

  return NextResponse.json(users);
}
