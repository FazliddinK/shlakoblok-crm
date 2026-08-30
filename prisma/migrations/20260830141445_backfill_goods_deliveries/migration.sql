-- Backfill deliveries for existing paid/prepayment sales (assume fully delivered at sale time)
INSERT INTO "GoodsDelivery" ("id", "saleId", "quantity", "licensePlate", "note", "userId", "createdAt")
SELECT
  'gd_' || s."id",
  s."id",
  s."quantity",
  c."licensePlate",
  '',
  s."userId",
  s."createdAt"
FROM "Sale" s
JOIN "Client" c ON c."id" = s."clientId"
WHERE s."paymentType" IN ('paid', 'prepayment')
AND NOT EXISTS (
  SELECT 1 FROM "GoodsDelivery" gd WHERE gd."saleId" = s."id"
);
