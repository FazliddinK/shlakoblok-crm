"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  Locale,
  localeToIntl,
  normalizeLocale,
  translate,
} from "@/lib/i18n";
import { BUSINESS_TIME_ZONE } from "@/lib/dates";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (source: string, vars?: Record<string, string | number>) => string;
  formatCurrency: (value: number) => string;
  formatDate: (value: string | Date) => string;
  formatDateTime: (value: string | Date) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  initialLocale = DEFAULT_LOCALE,
  children,
}: {
  initialLocale?: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(normalizeLocale(initialLocale));

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      const normalized = normalizeLocale(next);
      document.cookie = `${LOCALE_COOKIE}=${normalized}; Path=/; Max-Age=31536000; SameSite=Lax`;
      setLocaleState(normalized);
      document.documentElement.lang = normalized;
      router.refresh();
    },
    [router],
  );

  const value = useMemo<I18nContextValue>(() => {
    const intlLocale = localeToIntl(locale);
    return {
      locale,
      setLocale,
      t: (source, vars) => translate(locale, source, vars),
      formatCurrency: (amount) =>
        `${new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 0 }).format(amount)} ${locale === "ru" ? "сум" : "so‘m"}`,
      formatDate: (date) =>
        new Intl.DateTimeFormat(intlLocale, {
          timeZone: BUSINESS_TIME_ZONE,
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).format(new Date(date)),
      formatDateTime: (date) =>
        new Intl.DateTimeFormat(intlLocale, {
          timeZone: BUSINESS_TIME_ZONE,
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(date)),
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
