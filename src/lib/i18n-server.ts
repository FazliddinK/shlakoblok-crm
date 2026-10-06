import type { NextRequest } from "next/server";
import { DEFAULT_LOCALE, Locale, LOCALE_COOKIE, normalizeLocale, translate } from "@/lib/i18n";

export function requestLocale(request?: NextRequest): Locale {
  if (!request) return DEFAULT_LOCALE;
  return normalizeLocale(request.cookies.get(LOCALE_COOKIE)?.value);
}

export function requestT(request?: NextRequest) {
  const locale = requestLocale(request);
  return (source: string, vars?: Record<string, string | number>) =>
    translate(locale, source, vars);
}
