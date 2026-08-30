import type { Sale, Client, User } from "@prisma/client";
import { formatCurrency, formatDateTime } from "@/lib/labels";
import { PAYMENT_TYPE_LABELS } from "@/lib/constants";

export type SaleWithRelations = Sale & {
  client: Client;
  user: Pick<User, "displayName">;
};

interface ReceiptProps {
  sale: SaleWithRelations;
}

export function Receipt({ sale }: ReceiptProps) {
  return (
    <div className="receipt-content mx-auto w-[80mm] bg-white p-4 font-mono text-xs text-black">
      <div className="text-center">
        <p className="text-sm font-bold">SHLAKOBLOK</p>
        <p className="text-[10px]">Учёт продаж шлакоблоков</p>
        <p className="mt-1 border-t border-dashed border-black pt-1 text-[10px]">
          Кассовый чек
        </p>
      </div>

      <div className="mt-3 space-y-1 border-t border-dashed border-black pt-2">
        <Row label="Дата" value={formatDateTime(sale.createdAt)} />
        <Row label="Чек №" value={sale.id.slice(-8).toUpperCase()} />
        <Row label="Оператор" value={sale.user.displayName} />
      </div>

      <div className="mt-3 space-y-1 border-t border-dashed border-black pt-2">
        <p className="font-bold">Клиент</p>
        <Row label="Марка авто" value={sale.client.carBrand} />
        <Row label="Гос. номер" value={sale.client.licensePlate} />
        {sale.client.phone && <Row label="Телефон" value={sale.client.phone} />}
      </div>

      <div className="mt-3 space-y-1 border-t border-dashed border-black pt-2">
        <p className="font-bold">Товар</p>
        <Row label="Наименование" value="Шлакоблок" />
        <Row label="Количество" value={`${sale.quantity} шт`} />
        <Row label="Цена за шт" value={formatCurrency(sale.pricePerUnit)} />
        <Row
          label="Оплата"
          value={PAYMENT_TYPE_LABELS[sale.paymentType] ?? sale.paymentType}
        />
      </div>

      <div className="mt-3 border-t border-double border-black pt-2">
        <div className="flex justify-between text-sm font-bold">
          <span>ИТОГО:</span>
          <span>{formatCurrency(sale.totalPrice)}</span>
        </div>
      </div>

      {sale.notes && (
        <div className="mt-2 border-t border-dashed border-black pt-2">
          <p className="text-[10px]">Примечание: {sale.notes}</p>
        </div>
      )}

      <div className="mt-4 text-center text-[10px]">
        <p>Спасибо за покупку!</p>
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

export function printReceipt(sale: SaleWithRelations) {
  const printWindow = window.open("", "_blank", "width=400,height=600");
  if (!printWindow) {
    alert("Разрешите всплывающие окна для печати чека");
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html><head>
      <meta charset="utf-8">
      <title>Чек ${sale.id.slice(-8)}</title>
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
          <p style="font-size:10px">Учёт продаж шлакоблоков</p>
          <p style="font-size:10px;margin-top:4px">Кассовый чек</p>
        </div>
        <div class="divider">
          <div class="row"><span>Дата:</span><span>${formatDateTime(sale.createdAt)}</span></div>
          <div class="row"><span>Чек №:</span><span>${sale.id.slice(-8).toUpperCase()}</span></div>
          <div class="row"><span>Оператор:</span><span>${sale.user.displayName}</span></div>
        </div>
        <div class="divider">
          <p class="bold">Клиент</p>
          <div class="row"><span>Марка авто:</span><span>${sale.client.carBrand}</span></div>
          <div class="row"><span>Гос. номер:</span><span>${sale.client.licensePlate}</span></div>
          ${sale.client.phone ? `<div class="row"><span>Телефон:</span><span>${sale.client.phone}</span></div>` : ""}
        </div>
        <div class="divider">
          <p class="bold">Товар</p>
          <div class="row"><span>Наименование:</span><span>Шлакоблок</span></div>
          <div class="row"><span>Количество:</span><span>${sale.quantity} шт</span></div>
          <div class="row"><span>Цена за шт:</span><span>${formatCurrency(sale.pricePerUnit)}</span></div>
        </div>
        <div class="divider double">
          <div class="row total"><span>ИТОГО:</span><span>${formatCurrency(sale.totalPrice)}</span></div>
        </div>
        ${sale.notes ? `<div class="divider"><p style="font-size:10px">Примечание: ${sale.notes}</p></div>` : ""}
        <div class="center" style="margin-top:16px;font-size:10px">
          <p>Спасибо за покупку!</p>
        </div>
      </div>
      <script>window.onload = function() { window.print(); }</script>
    </body></html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
