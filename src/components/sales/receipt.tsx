"use client";

import type { Sale, Client, User } from "@prisma/client";
import { useI18n } from "@/components/i18n-provider";
import { DEFAULT_LOCALE, type Locale, translate } from "@/lib/i18n";
import { BUSINESS_TIME_ZONE } from "@/lib/dates";

export type SaleWithRelations = Sale & {
  client: Client;
  user: Pick<User, "displayName">;
};

interface ReceiptProps {
  sale: SaleWithRelations;
}

// Shared by the on-screen receipt and the separate print window.
// Values for the product name and quantity are exactly twice the base size.
const RECEIPT_STYLES = `
  .simple-receipt, .simple-receipt * { box-sizing: border-box; }
  .simple-receipt {
    width: 80mm;
    max-width: 100%;
    margin: 0 auto;
    padding: 3mm;
    background: #fff;
    color: #000;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12pt;
    font-weight: 400;
    line-height: 1.25;
  }
  .simple-receipt p { margin: 0; }
  .simple-receipt .receipt-heading {
    margin-bottom: 3mm;
    text-align: center;
    font-size: 18pt;
    font-weight: 700;
    line-height: 1.1;
  }
  .simple-receipt .receipt-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 2mm;
    margin-top: 1mm;
    break-inside: avoid;
  }
  .simple-receipt .receipt-row-label { flex-shrink: 0; }
  .simple-receipt .receipt-row-value {
    min-width: 0;
    text-align: right;
    font-weight: 700;
    overflow-wrap: anywhere;
  }
  .simple-receipt .receipt-client { margin-top: 2mm; }
  .simple-receipt .receipt-section-title { font-weight: 700; }
  .simple-receipt .receipt-goods {
    margin-top: 3mm;
    border-top: 1px solid #000;
    padding-top: 2mm;
  }
  .simple-receipt .receipt-large-field {
    text-align: center;
    break-inside: avoid;
  }
  .simple-receipt .receipt-large-field + .receipt-large-field { margin-top: 2mm; }
  .simple-receipt .receipt-large-value {
    margin-top: 1mm;
    font-size: 24pt;
    font-weight: 700;
    line-height: 1.1;
    overflow-wrap: anywhere;
  }
`;

function formatReceiptDate(value: string | Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BUSINESS_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return `${part("day")}.${part("month")}.${part("year")} ${part("hour")}:${part("minute")}`;
}

function receiptData(sale: SaleWithRelations, locale: Locale) {
  return {
    date: formatReceiptDate(sale.createdAt),
    operator: sale.user.displayName,
    carBrand: sale.client.carBrand,
    licensePlate: sale.client.licensePlate,
    product: translate(locale, "Шлакоблок"),
    // Keep the existing quantity source; this is a layout-only change.
    quantity: `${sale.quantity} ${locale === "ru" ? "шт" : "dona"}`,
  };
}

export function Receipt({ sale }: ReceiptProps) {
  const { t, locale } = useI18n();
  const data = receiptData(sale, locale);

  return (
    <div className="receipt-content simple-receipt">
      <style>{RECEIPT_STYLES}</style>
      <p className="receipt-heading">ШЛАКОБЛОК</p>
      <Row label={t("Дата")} value={data.date} />
      <Row label={t("Оператор")} value={data.operator} />
      <div className="receipt-client">
        <p className="receipt-section-title">{t("Клиент")}:</p>
        <Row label={t("Марка авто")} value={data.carBrand} />
        <Row label={t("Гос. номер")} value={data.licensePlate} />
      </div>
      <div className="receipt-goods">
        <div className="receipt-large-field">
          <p>{t("Наименование")}:</p>
          <p className="receipt-large-value">{data.product}</p>
        </div>
        <div className="receipt-large-field">
          <p>{t("Количество")}:</p>
          <p className="receipt-large-value">{data.quantity}</p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="receipt-row">
      <span className="receipt-row-label">{label}:</span>
      <span className="receipt-row-value">{value}</span>
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

  const data = receiptData(sale, locale);
  const row = (label: string, value: string) =>
    `<div class="receipt-row"><span class="receipt-row-label">${escapeHtml(label)}:</span><span class="receipt-row-value">${escapeHtml(value)}</span></div>`;

  const html = `
    <!DOCTYPE html>
    <html lang="${locale === "ru" ? "ru" : "uz"}"><head>
      <meta charset="utf-8">
      <title>ШЛАКОБЛОК</title>
      <style>
        html, body { margin: 0; padding: 0; }
        ${RECEIPT_STYLES}
        @media print {
          @page { margin: 0; }
        }
      </style>
    </head><body>
      <div class="receipt-content simple-receipt">
        <p class="receipt-heading">ШЛАКОБЛОК</p>
        ${row(t("Дата"), data.date)}
        ${row(t("Оператор"), data.operator)}
        <div class="receipt-client">
          <p class="receipt-section-title">${escapeHtml(t("Клиент"))}:</p>
          ${row(t("Марка авто"), data.carBrand)}
          ${row(t("Гос. номер"), data.licensePlate)}
        </div>
        <div class="receipt-goods">
          <div class="receipt-large-field">
            <p>${escapeHtml(t("Наименование"))}:</p>
            <p class="receipt-large-value">${escapeHtml(data.product)}</p>
          </div>
          <div class="receipt-large-field">
            <p>${escapeHtml(t("Количество"))}:</p>
            <p class="receipt-large-value">${escapeHtml(data.quantity)}</p>
          </div>
        </div>
      </div>
      <script>window.onload = function() { window.print(); }</script>
    </body></html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
