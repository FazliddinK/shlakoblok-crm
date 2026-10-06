"use client";

import type { Sale, Client, User } from "@prisma/client";
import { useI18n } from "@/components/i18n-provider";
import { DEFAULT_LOCALE, Locale, translate } from "@/lib/i18n";
import {
  formatCurrency as formatCurrencyForLocale,
  formatDateTime as formatDateTimeForLocale,
} from "@/lib/labels";

export type SaleWithRelations = Sale & {
  client: Client;
  user: Pick<User, "displayName">;
};

interface ReceiptProps {
  sale: SaleWithRelations;
}

const paymentSource: Record<string, string> = {
  paid: "Оплачено",
  debt: "В долг",
  prepayment: "Предоплата",
};

export function Receipt({ sale }: ReceiptProps) {
  const { t, locale, formatCurrency, formatDateTime } = useI18n();
  const unit = locale === "ru" ? "шт" : "dona";

  return (
    <div className="receipt-content mx-auto w-[80mm] bg-white p-4 font-mono text-xs text-black">
      <div className="text-center">
        <p className="text-sm font-bold">SHLAKOBLOK</p>
        <p className="text-[10px]">{t("Учёт продаж шлакоблоков")}</p>
        <p className="mt-1 border-t border-dashed border-black pt-1 text-[10px]">
          {t("Кассовый чек")}
        </p>
      </div>

      <div className="mt-3 space-y-1 border-t border-dashed border-black pt-2">
        <Row label={t("Дата")} value={formatDateTime(sale.createdAt)} />
        <Row label={t("Чек №")} value={sale.id.slice(-8).toUpperCase()} />
        <Row label={t("Оператор")} value={sale.user.displayName} />
      </div>

      <div className="mt-3 space-y-1 border-t border-dashed border-black pt-2">
        <p className="font-bold">{t("Клиент")}</p>
        <Row label={t("Марка авто")} value={sale.client.carBrand} />
        <Row label={t("Гос. номер")} value={sale.client.licensePlate} />
        {sale.client.phone && <Row label={t("Телефон")} value={sale.client.phone} />}
      </div>

      <div className="mt-3 space-y-1 border-t border-dashed border-black pt-2">
        <p className="font-bold">{t("Товар")}</p>
        <Row label={t("Наименование")} value={t("Шлакоблок")} />
        <Row label={t("Количество")} value={`${sale.quantity} ${unit}`} />
        <Row label={t("Цена за шт")} value={formatCurrency(sale.pricePerUnit)} />
        <Row
          label={t("Оплата")}
          value={t(paymentSource[sale.paymentType] ?? sale.paymentType)}
        />
      </div>

      <div className="mt-3 border-t border-double border-black pt-2">
        <div className="flex justify-between text-sm font-bold">
          <span>{t("ИТОГО")}:</span>
          <span>{formatCurrency(sale.totalPrice)}</span>
        </div>
      </div>

      {sale.notes && (
        <div className="mt-2 border-t border-dashed border-black pt-2">
          <p className="text-[10px]">{t("Примечание")}: {sale.notes}</p>
        </div>
      )}

      <div className="mt-4 text-center text-[10px]">
        <p>{t("Спасибо за покупку!")}</p>
        <p className="mt-1">shlakoblok-crm</p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-[10px] text-zinc-600">{label}:</span>
      <span className="text-right text-[10px] font-medium">{value}</span>
    </div>
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function printReceipt(sale: SaleWithRelations, locale: Locale = DEFAULT_LOCALE) {
  const printWindow = window.open("", "_blank", "width=400,height=600");
  const t = (source: string) => translate(locale, source);

  if (!printWindow) {
    alert(t("Разрешите всплывающие окна для печати чека"));
    return;
  }

  const unit = locale === "ru" ? "шт" : "dona";
  const formatMoney = (value: number) => formatCurrencyForLocale(value, locale);
  const formatWhen = (value: string | Date) => formatDateTimeForLocale(value, locale);

  const html = `
    <!DOCTYPE html>
    <html lang="${locale}"><head>
      <meta charset="utf-8">
      <title>${t("Чек №")} ${sale.id.slice(-8)}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; font-size: 12px; }
        .receipt { width: 80mm; padding: 8mm 4mm; margin: 0 auto; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; padding-top: 8px; }
        .double { border-top: 3px double #000; }
        .row { display: flex; justify-content: space-between; margin: 2px 0; }
        .total { font-size: 14px; font-weight: bold; }
        @media print {
          @page { size: 80mm auto; margin: 0; }
          body { margin: 0; }
        }
      </style>
    </head><body>
      <div class="receipt">
        <div class="center">
          <p class="bold" style="font-size:14px">SHLAKOBLOK</p>
          <p style="font-size:10px">${t("Учёт продаж шлакоблоков")}</p>
          <p style="font-size:10px;margin-top:4px">${t("Кассовый чек")}</p>
        </div>
        <div class="divider">
          <div class="row"><span>${t("Дата")}:</span><span>${formatWhen(sale.createdAt)}</span></div>
          <div class="row"><span>${t("Чек №")}:</span><span>${sale.id.slice(-8).toUpperCase()}</span></div>
          <div class="row"><span>${t("Оператор")}:</span><span>${escapeHtml(sale.user.displayName)}</span></div>
        </div>
        <div class="divider">
          <p class="bold">${t("Клиент")}</p>
          <div class="row"><span>${t("Марка авто")}:</span><span>${escapeHtml(sale.client.carBrand)}</span></div>
          <div class="row"><span>${t("Гос. номер")}:</span><span>${escapeHtml(sale.client.licensePlate)}</span></div>
          ${sale.client.phone ? `<div class="row"><span>${t("Телефон")}:</span><span>${escapeHtml(sale.client.phone)}</span></div>` : ""}
        </div>
        <div class="divider">
          <p class="bold">${t("Товар")}</p>
          <div class="row"><span>${t("Наименование")}:</span><span>${t("Шлакоблок")}</span></div>
          <div class="row"><span>${t("Количество")}:</span><span>${sale.quantity} ${unit}</span></div>
          <div class="row"><span>${t("Цена за шт")}:</span><span>${formatMoney(sale.pricePerUnit)}</span></div>
        </div>
        <div class="divider double">
          <div class="row total"><span>${t("ИТОГО")}:</span><span>${formatMoney(sale.totalPrice)}</span></div>
        </div>
        ${sale.notes ? `<div class="divider"><p style="font-size:10px">${t("Примечание")}: ${escapeHtml(sale.notes)}</p></div>` : ""}
        <div class="center" style="margin-top:16px;font-size:10px">
          <p>${t("Спасибо за покупку!")}</p>
        </div>
      </div>
      <script>window.onload = function() { window.print(); }</script>
    </body></html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
