-- Feature #7: QR Code Management & Analytics System
CREATE TYPE "QrCodeStatus_new" AS ENUM ('DRAFT', 'PRINTED', 'DEPLOYED', 'ACTIVE', 'RETIRED');
CREATE TYPE "QrCodeType" AS ENUM ('VENUE', 'RESTROOM', 'CAMPAIGN', 'TEST');
CREATE TYPE "QrStickerTemplate" AS ENUM ('STALL_DOOR', 'URINAL_WALL', 'TABLE_TENT', 'WINDOW_STICKER');
CREATE TYPE "QrLifecycleAction" AS ENUM ('CREATE', 'PRINT', 'DEPLOY', 'REPLACE', 'RETIRE');

ALTER TABLE "QrCode" RENAME TO "qr_codes";
ALTER INDEX "QrCode_pkey" RENAME TO "qr_codes_pkey";
ALTER INDEX "QrCode_code_key" RENAME TO "qr_codes_qr_slug_key";
ALTER TABLE "qr_codes" RENAME COLUMN "code" TO "qr_slug";
ALTER TABLE "qr_codes" RENAME COLUMN "label" TO "qr_name";
ALTER TABLE "qr_codes" RENAME COLUMN "destination" TO "qr_url";
ALTER TABLE "qr_codes" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "qr_codes" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "qr_codes" ADD COLUMN "uuid" TEXT NOT NULL DEFAULT gen_random_uuid()::text;
ALTER TABLE "qr_codes" ADD COLUMN "assignedDistributorId" TEXT;
ALTER TABLE "qr_codes" ADD COLUMN "qr_type" "QrCodeType" NOT NULL DEFAULT 'RESTROOM';
ALTER TABLE "qr_codes" ADD COLUMN "sticker_template" "QrStickerTemplate" NOT NULL DEFAULT 'STALL_DOOR';
ALTER TABLE "qr_codes" ADD COLUMN "short_url" TEXT;
ALTER TABLE "qr_codes" ADD COLUMN "call_to_action" TEXT NOT NULL DEFAULT 'Scan for Stall Talk';
ALTER TABLE "qr_codes" ADD COLUMN "installed_at" TIMESTAMP(3);
ALTER TABLE "qr_codes" ADD COLUMN "last_scan_at" TIMESTAMP(3);
ALTER TABLE "qr_codes" ADD COLUMN "installation_photo_url" TEXT;
ALTER TABLE "qr_codes" ADD COLUMN "campaign_source" TEXT;
ALTER TABLE "qr_codes" ADD COLUMN "advertisement_source" TEXT;
ALTER TABLE "qr_codes" ADD COLUMN "promotion_source" TEXT;
ALTER TABLE "qr_codes" ADD COLUMN "coupon_source" TEXT;
UPDATE "qr_codes" SET "short_url" = COALESCE("short_url", '/q/' || "qr_slug") WHERE "qr_slug" IS NOT NULL;
-- Drop the legacy enum default before changing the column type; PostgreSQL cannot cast an attached default automatically.
ALTER TABLE "qr_codes" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "qr_codes" ALTER COLUMN "status" TYPE TEXT USING (CASE WHEN "status"::text = 'ASSIGNED' THEN 'ACTIVE' WHEN "status"::text = 'INVENTORY' THEN 'DRAFT' ELSE "status"::text END);
ALTER TABLE "qr_codes" ALTER COLUMN "status" TYPE "QrCodeStatus_new" USING "status"::"QrCodeStatus_new";
ALTER TABLE "qr_codes" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
DROP TYPE "QrCodeStatus";
ALTER TYPE "QrCodeStatus_new" RENAME TO "QrCodeStatus";
CREATE UNIQUE INDEX "qr_codes_uuid_key" ON "qr_codes"("uuid");
CREATE INDEX "qr_codes_venueId_restroomId_status_idx" ON "qr_codes"("venueId", "restroomId", "status");
CREATE INDEX "qr_codes_qr_type_status_idx" ON "qr_codes"("qr_type", "status");
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_assignedDistributorId_fkey" FOREIGN KEY ("assignedDistributorId") REFERENCES "Distributor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "qr_scans" (
  "id" TEXT NOT NULL,
  "qr_code_id" TEXT NOT NULL,
  "publisher_id" TEXT,
  "venue_id" TEXT,
  "restroom_id" TEXT,
  "issue_id" TEXT,
  "visitor_id" TEXT,
  "session_id" TEXT,
  "device_type" TEXT,
  "browser" TEXT,
  "operating_system" TEXT,
  "city" TEXT,
  "state" TEXT,
  "country" TEXT,
  "referral_source" TEXT,
  "campaign_source" TEXT,
  "advertisement_source" TEXT,
  "promotion_source" TEXT,
  "coupon_source" TEXT,
  "dwell_time_ms" INTEGER,
  "metadata" JSONB,
  "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "qr_scans_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "qr_scans_qr_code_id_scanned_at_idx" ON "qr_scans"("qr_code_id", "scanned_at");
CREATE INDEX "qr_scans_venue_id_scanned_at_idx" ON "qr_scans"("venue_id", "scanned_at");
ALTER TABLE "qr_scans" ADD CONSTRAINT "qr_scans_qr_code_id_fkey" FOREIGN KEY ("qr_code_id") REFERENCES "qr_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "qr_scans" ADD CONSTRAINT "qr_scans_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "Publisher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "qr_scans" ADD CONSTRAINT "qr_scans_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "qr_scans" ADD CONSTRAINT "qr_scans_restroom_id_fkey" FOREIGN KEY ("restroom_id") REFERENCES "Restroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "qr_scans" ADD CONSTRAINT "qr_scans_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "Issue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "qr_lifecycle_events" (
  "id" TEXT NOT NULL,
  "qr_code_id" TEXT NOT NULL,
  "action" "QrLifecycleAction" NOT NULL,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "qr_lifecycle_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "qr_lifecycle_events_qr_code_id_created_at_idx" ON "qr_lifecycle_events"("qr_code_id", "created_at");
ALTER TABLE "qr_lifecycle_events" ADD CONSTRAINT "qr_lifecycle_events_qr_code_id_fkey" FOREIGN KEY ("qr_code_id") REFERENCES "qr_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
