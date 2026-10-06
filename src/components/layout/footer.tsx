"use client";

import { useI18n } from "@/components/i18n-provider";
import { CREATOR_INFO } from "@/lib/constants";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="border-t bg-white px-4 py-3 text-center text-xs text-zinc-500 sm:px-6 lg:px-8">
      {t("Разработчик")}: {CREATOR_INFO}
    </footer>
  );
}
