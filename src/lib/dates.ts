import { SALES_PERIOD_LABELS } from "@/lib/constants";

export function todayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildDateFilter(from?: string | null, to?: string | null) {
  if (!from && !to) return {};
  return {
    createdAt: {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59.999`) } : {}),
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

export function resolveSalesPeriod(
  period: string,
  customFrom?: string | null,
  customTo?: string | null,
) {
  const now = new Date();
  const today = todayDateString();

  switch (period) {
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const date = formatDateString(y);
      return { from: date, to: date, label: SALES_PERIOD_LABELS.yesterday };
    }
    case "week": {
      const start = new Date(now);
      const day = start.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - diff);
      return {
        from: formatDateString(start),
        to: today,
        label: SALES_PERIOD_LABELS.week,
      };
    }
    case "month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        from: formatDateString(start),
        to: today,
        label: SALES_PERIOD_LABELS.month,
      };
    }
    case "custom": {
      return {
        from: customFrom ?? today,
        to: customTo ?? today,
        label:
          customFrom && customTo
            ? customFrom === customTo
              ? customFrom
              : `${customFrom} — ${customTo}`
            : SALES_PERIOD_LABELS.custom,
      };
    }
    case "today":
    default:
      return { from: today, to: today, label: SALES_PERIOD_LABELS.today };
  }
}
