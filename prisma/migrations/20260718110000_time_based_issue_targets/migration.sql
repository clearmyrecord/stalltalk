-- Time-based venue issue scheduling for permanent QR routes.
-- Also safely repairs production databases where the prior permanent QR target
-- migration was recorded in _prisma_migrations but its idempotent DDL did not
-- materialize in the active production database/branch.
DO $$ BEGIN
  CREATE TYPE "IssueTargetType" AS ENUM ('VENUE', 'RESTROOM', 'QR_PLACEMENT');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "QrPlacementType" AS ENUM ('STALL', 'MIRROR', 'URINAL', 'ENTRANCE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "publicToken" TEXT;
UPDATE "Venue" SET "publicToken" = "slug" WHERE "publicToken" IS NULL;
ALTER TABLE "Venue" ALTER COLUMN "publicToken" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Venue_publicToken_key" ON "Venue"("publicToken");

ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "public_token" TEXT;
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "internal_label" TEXT;
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "placement_type" "QrPlacementType" NOT NULL DEFAULT 'OTHER';
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;
UPDATE "qr_codes" SET "public_token" = COALESCE("slug", "qr_slug", "uuid") WHERE "public_token" IS NULL;
UPDATE "qr_codes" SET "internal_label" = "qr_name" WHERE "internal_label" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "qr_codes_public_token_key" ON "qr_codes"("public_token");
ALTER TABLE "qr_codes" ALTER COLUMN "public_token" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "qr_codes_venue_public_token_idx" ON "qr_codes"("venueId", "public_token", "is_active");

CREATE TABLE IF NOT EXISTS "IssueTarget" (
  "id" TEXT NOT NULL,
  "issueId" TEXT NOT NULL,
  "venueId" TEXT NOT NULL,
  "restroomId" TEXT,
  "qrCodeId" TEXT,
  "targetType" "IssueTargetType" NOT NULL,
  "isLive" BOOLEAN NOT NULL DEFAULT false,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IssueTarget_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IssueTarget_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "IssueTarget_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "IssueTarget_restroomId_fkey" FOREIGN KEY ("restroomId") REFERENCES "Restroom"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "IssueTarget_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "qr_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "IssueTarget_issueId_idx" ON "IssueTarget"("issueId");
CREATE INDEX IF NOT EXISTS "IssueTarget_venueId_targetType_isLive_idx" ON "IssueTarget"("venueId", "targetType", "isLive");

ALTER TABLE "IssueContentBlock" ADD COLUMN IF NOT EXISTS "headline" TEXT;
ALTER TABLE "IssueContentBlock" ADD COLUMN IF NOT EXISTS "sectionType" "ContentBlockType";
ALTER TABLE "IssueContentBlock" ADD COLUMN IF NOT EXISTS "isVisible" BOOLEAN NOT NULL DEFAULT true;
UPDATE "IssueContentBlock" SET "headline" = "title" WHERE "headline" IS NULL;
UPDATE "IssueContentBlock" SET "sectionType" = "type" WHERE "sectionType" IS NULL;
ALTER TABLE "IssueContentBlock" ALTER COLUMN "headline" SET NOT NULL;
ALTER TABLE "IssueContentBlock" ALTER COLUMN "sectionType" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "IssueContentBlock_issueId_sortOrder_idx" ON "IssueContentBlock"("issueId", "sortOrder");

ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "timeZone" TEXT NOT NULL DEFAULT 'America/Los_Angeles';
UPDATE "Venue" SET "timeZone" = 'America/Los_Angeles' WHERE "timeZone" IS NULL OR "timeZone" = '' OR lower("city") IN ('las vegas', 'north las vegas', 'henderson') OR "state" IN ('NV', 'Nevada');

ALTER TABLE "IssueTarget" ADD COLUMN IF NOT EXISTS "publishAt" TIMESTAMP(3);
ALTER TABLE "IssueTarget" ADD COLUMN IF NOT EXISTS "unpublishAt" TIMESTAMP(3);
ALTER TABLE "IssueTarget" ADD COLUMN IF NOT EXISTS "canceledAt" TIMESTAMP(3);
UPDATE "IssueTarget" SET "publishAt" = COALESCE("publishedAt", "createdAt") WHERE "publishAt" IS NULL;
ALTER TABLE "IssueTarget" ALTER COLUMN "publishAt" SET NOT NULL;

DROP INDEX IF EXISTS "IssueTarget_live_venue_unique";
DROP INDEX IF EXISTS "IssueTarget_live_restroom_unique";
DROP INDEX IF EXISTS "IssueTarget_live_qr_unique";
CREATE INDEX IF NOT EXISTS "IssueTarget_venue_schedule_idx" ON "IssueTarget"("venueId", "targetType", "publishAt");
CREATE INDEX IF NOT EXISTS "IssueTarget_restroom_schedule_idx" ON "IssueTarget"("restroomId", "targetType", "publishAt");
CREATE INDEX IF NOT EXISTS "IssueTarget_qr_schedule_idx" ON "IssueTarget"("qrCodeId", "targetType", "publishAt");
