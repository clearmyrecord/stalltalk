-- Backfill QR code statuses after QrCodeStatus enum additions have committed.
-- This must remain separate from 20260613050000_production_schema_repair because PostgreSQL
-- rejects using enum values added by ALTER TYPE in the same migration transaction.
DO $$
BEGIN
  IF to_regclass('public."qr_codes"') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'qr_codes'
        AND column_name = 'status'
    ) THEN
      ALTER TABLE "qr_codes" ADD COLUMN "status" "QrCodeStatus";
    END IF;

    -- Preserve rows while normalizing legacy production enum labels to the Prisma schema labels.
    UPDATE "qr_codes" SET "status" = 'DRAFT' WHERE "status" IS NULL OR "status"::text = 'INVENTORY';
    UPDATE "qr_codes" SET "status" = 'ACTIVE' WHERE "status"::text = 'ASSIGNED';

    ALTER TABLE "qr_codes" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
    ALTER TABLE "qr_codes" ALTER COLUMN "status" SET NOT NULL;
  END IF;
END $$;
