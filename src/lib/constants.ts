export type EntityType =
  | "client"
  | "sale"
  | "expense"
  | "counterparty"
  | "expense_category"
  | "goods_delivery";

export const ENTITY_LABELS: Record<EntityType, string> = {
  client: "Клиент",
  sale: "Продажа",
  expense: "Расход",
  counterparty: "Контрагент",
  expense_category: "Категория расходов",
  goods_delivery: "Выдача товара",
};

export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  paid: "Оплачено",
  debt: "В долг",
  prepayment: "Предоплата",
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "Администратор",
  operator: "Оператор",
};

export const CREATOR_INFO = 'ООО "Qurilish resurslari"';

export const SALES_PERIOD_LABELS: Record<string, string> = {
  today: "Сегодня",
  yesterday: "Вчера",
  week: "Текущая неделя",
  month: "Текущий месяц",
  custom: "Произвольный период",
};
