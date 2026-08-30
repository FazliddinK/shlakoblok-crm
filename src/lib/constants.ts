export type EntityType =
  | "client"
  | "sale"
  | "expense"
  | "counterparty"
  | "expense_category";

export const ENTITY_LABELS: Record<EntityType, string> = {
  client: "Клиент",
  sale: "Продажа",
  expense: "Расход",
  counterparty: "Контрагент",
  expense_category: "Категория расходов",
};

export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  paid: "Оплачено",
  debt: "В долг",
  prepayment: "Предоплата",
};
