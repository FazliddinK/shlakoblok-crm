-- AlterTable
ALTER TABLE "Sale" ADD COLUMN "paidAmount" REAL NOT NULL DEFAULT 0;

-- Backfill: debt sales had no cash at creation; paid/prepayment had full cash
UPDATE "Sale"
SET "paidAmount" = CASE
  WHEN "paymentType" = 'debt' THEN 0
  ELSE "totalPrice"
END;
