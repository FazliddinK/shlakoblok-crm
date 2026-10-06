import { SALES_PERIOD_LABELS } from "@/lib/constants";

export const BUSINESS_TIME_ZONE = "Asia/Tashkent";
const BUSINESS_UTC_OFFSET = "+05:00";

function getBusinessDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = part.value;
  }

  return {
    year: values.year,
    month: values.month,
    day: values.day,
  };
}

function addCalendarDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function todayDateString(): string {
  return formatDateString(new Date());
}

export function formatDateString(date: Date): string {
  const { year, month, day } = getBusinessDateParts(date);
  return `${year}-${month}-${day}`;
}

export function buildDateFilter(from?: string | null, to?: string | null) {
  if (!from && !to) return {};

  return {
    createdAt: {
      ...(from ? { gte: new Date(`${from}T00:00:00.000${BUSINESS_UTC_OFFSET}`) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59.999${BUSINESS_UTC_OFFSET}`) } : {}),
    },
  };
}

export function resolveDateRange(
  from: string | null,
  to: string | null,
  defaultToday = false,
) {
  if (from || to) {
    return { from: from ?? undefined, to: to ?? undefined };
  }
  if (defaultToday) {
    const today = todayDateString();
    return { from: today, to: today };
  }
  return { from: undefined, to: undefined };
}

export const REPORT_PERIOD_LABELS: Record<string, string> = {
  last7: "Последние 7 дней",
  today: "Сегодня",
  yesterday: "Вчера",
  week: "Эта неделя",
  month: "Этот месяц",
  last_month: "Прошлый месяц",
  custom: "Произвольный период",
};

export function resolveSalesPeriod(
  period: string,
  customFrom?: string | null,
  customTo?: string | null,
) {
  return resolveReportPeriod(period, customFrom, customTo, SALES_PERIOD_LABELS);
}

export function resolveReportPeriod(
  period: string,
  customFrom?: string | null,
  customTo?: string | null,
  labels: Record<string, string> = REPORT_PERIOD_LABELS,
) {
  const today = todayDateString();
  const [year, month] = today.split("-").map(Number);

  switch (period) {
    case "last7":
      return {
        from: addCalendarDays(today, -6),
        to: today,
        label: labels.last7 ?? "Последние 7 дней",
      };

    case "yesterday": {
      const date = addCalendarDays(today, -1);
      return { from: date, to: date, label: labels.yesterday };
    }

    case "week": {
      const weekday = new Date(`${today}T00:00:00.000Z`).getUTCDay();
      const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
      return {
        from: addCalendarDays(today, -daysSinceMonday),
        to: today,
        label: labels.week,
      };
    }

    case "last_month": {
      const currentMonthStart = new Date(Date.UTC(year, month - 1, 1));
      const previousMonthEnd = new Date(currentMonthStart);
      previousMonthEnd.setUTCDate(0);
      const previousMonthStart = new Date(
        Date.UTC(previousMonthEnd.getUTCFullYear(), previousMonthEnd.getUTCMonth(), 1),
      );

      const asDateString = (date: Date) =>
        [
          date.getUTCFullYear(),
          String(date.getUTCMonth() + 1).padStart(2, "0"),
          String(date.getUTCDate()).padStart(2, "0"),
        ].join("-");

      return {
        from: asDateString(previousMonthStart),
        to: asDateString(previousMonthEnd),
        label: labels.last_month,
      };
    }

    case "month":
      return {
        from: `${today.slice(0, 7)}-01`,
        to: today,
        label: labels.month,
      };

    case "custom":
      return {
        from: customFrom ?? today,
        to: customTo ?? today,
        label:
          customFrom && customTo
            ? customFrom === customTo
              ? customFrom
              : `${customFrom} — ${customTo}`
            : labels.custom,
      };

    case "today":
    default:
      return { from: today, to: today, label: labels.today };
  }
}
