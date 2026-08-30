import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/login", "/api/auth/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    publicPaths.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const session = request.cookies.get("shlakoblok_session");

  if (!session?.value && pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  if (!session?.value && !pathname.startsWith("/api/")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session?.value && pathname === "/login") {
    return NextResponse.redirect(new URL("/sales", request.url));
  }

  if (session?.value && pathname === "/") {
    return NextResponse.redirect(new URL("/sales", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.svg$).*)"],
};
