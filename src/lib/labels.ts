import { BUSINESS_TIME_ZONE } from "@/lib/dates";
import { DEFAULT_LOCALE, Locale, localeToIntl } from "@/lib/i18n";

export function formatCurrency(value: number, locale: Locale = DEFAULT_LOCALE) {
  return (
    new Intl.NumberFormat(localeToIntl(locale), {
      maximumFractionDigits: 0,
    }).format(value) + (locale === "ru" ? " сум" : " so‘m")
  );
}

export function formatDate(iso: string | Date, locale: Locale = DEFAULT_LOCALE) {
  return new Intl.DateTimeFormat(localeToIntl(locale), {
    timeZone: BUSINESS_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string | Date, locale: Locale = DEFAULT_LOCALE) {
  return new Intl.DateTimeFormat(localeToIntl(locale), {
    timeZone: BUSINESS_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
