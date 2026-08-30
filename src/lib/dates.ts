export function todayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
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
