"use client";

import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();

  return (
    <div className={cn("inline-flex rounded-lg border bg-white p-1 text-xs font-semibold text-zinc-700", className)}>
      <button
        type="button"
        onClick={() => setLocale("uz")}
        className={cn(
          "rounded-md px-2.5 py-1.5 transition-colors",
          locale === "uz" ? "bg-orange-500 text-white" : "hover:bg-zinc-100",
        )}
      >
        O‘Z
      </button>
      <button
        type="button"
        onClick={() => setLocale("ru")}
        className={cn(
          "rounded-md px-2.5 py-1.5 transition-colors",
          locale === "ru" ? "bg-orange-500 text-white" : "hover:bg-zinc-100",
        )}
      >
        RU
      </button>
    </div>
  );
}
