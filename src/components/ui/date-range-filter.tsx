"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { todayDateString } from "@/lib/dates";

interface DateRangeFilterProps {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  showTodayButton?: boolean;
  onToday?: () => void;
}

export function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  showTodayButton,
  onToday,
}: DateRangeFilterProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="grid gap-1">
        <Label className="text-xs text-zinc-500">С</Label>
        <Input
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className="w-40"
        />
      </div>
      <div className="grid gap-1">
        <Label className="text-xs text-zinc-500">По</Label>
        <Input
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className="w-40"
        />
      </div>
      {showTodayButton && onToday && (
        <button
          type="button"
          onClick={onToday}
          className="rounded-md border px-3 py-2 text-sm hover:bg-zinc-50"
        >
          Сегодня
        </button>
      )}
    </div>
  );
}

export function useTodayRange() {
  const today = todayDateString();
  return { from: today, to: today };
}
