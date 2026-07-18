-- Repair permanent QR routing and scheduled issue schema drift.
-- This migration is intentionally non-destructive and idempotent so it can run
-- after older migrations were recorded as applied while the active production
-- database/branch is missing some or all of their schema objects.

DO $$ BEGIN
  CREATE TYPE "IssueTargetType" AS ENUM ('VENUE', 'RESTROOM', 'QR_PLACEMENT');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "QrPlacementType" AS ENUM ('STALL', 'MIRROR', 'URINAL', 'ENTRANCE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "publicToken" TEXT;
UPDATE "Venue" SET "publicToken" = COALESCE(NULLIF("publicToken", ''), "slug", "id") WHERE "publicToken" IS NULL OR "publicToken" = '';
ALTER TABLE "Venue" ALTER COLUMN "publicToken" SET NOT NULL;
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "timeZone" TEXT NOT NULL DEFAULT 'America/Los_Angeles';
UPDATE "Venue" SET "timeZone" = 'America/Los_Angeles' WHERE "timeZone" IS NULL OR "timeZone" = '';
CREATE UNIQUE INDEX IF NOT EXISTS "Venue_publicToken_key" ON "Venue"("publicToken");

ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "public_token" TEXT;
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "internal_label" TEXT;
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "placement_type" "QrPlacementType" NOT NULL DEFAULT 'OTHER';
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;
UPDATE "qr_codes" SET "public_token" = COALESCE(NULLIF("public_token", ''), NULLIF("qr_slug", ''), NULLIF("uuid", ''), "id") WHERE "public_token" IS NULL OR "public_token" = '';
UPDATE "qr_codes" SET "internal_label" = COALESCE(NULLIF("internal_label", ''), "qr_name", "qr_slug", "id") WHERE "internal_label" IS NULL OR "internal_label" = '';
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
  "publishAt" TIMESTAMP(3),
  "unpublishAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IssueTarget_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "IssueTarget" ADD COLUMN IF NOT EXISTS "publishAt" TIMESTAMP(3);
ALTER TABLE "IssueTarget" ADD COLUMN IF NOT EXISTS "unpublishAt" TIMESTAMP(3);
ALTER TABLE "IssueTarget" ADD COLUMN IF NOT EXISTS "canceledAt" TIMESTAMP(3);
ALTER TABLE "IssueTarget" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);
ALTER TABLE "IssueTarget" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "IssueTarget" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "IssueTarget" SET "publishAt" = COALESCE("publishAt", "publishedAt", "createdAt") WHERE "publishAt" IS NULL;

DO $$ BEGIN
  ALTER TABLE "IssueTarget" ADD CONSTRAINT "IssueTarget_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "IssueTarget" ADD CONSTRAINT "IssueTarget_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "IssueTarget" ADD CONSTRAINT "IssueTarget_restroomId_fkey" FOREIGN KEY ("restroomId") REFERENCES "Restroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "IssueTarget" ADD CONSTRAINT "IssueTarget_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "qr_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "IssueTarget_issueId_idx" ON "IssueTarget"("issueId");
CREATE INDEX IF NOT EXISTS "IssueTarget_venueId_targetType_isLive_idx" ON "IssueTarget"("venueId", "targetType", "isLive");
CREATE INDEX IF NOT EXISTS "IssueTarget_venue_schedule_idx" ON "IssueTarget"("venueId", "targetType", "publishAt");
CREATE INDEX IF NOT EXISTS "IssueTarget_restroom_schedule_idx" ON "IssueTarget"("restroomId", "targetType", "publishAt");
CREATE INDEX IF NOT EXISTS "IssueTarget_qr_schedule_idx" ON "IssueTarget"("qrCodeId", "targetType", "publishAt");

INSERT INTO "IssueTarget" ("id", "issueId", "venueId", "restroomId", "qrCodeId", "targetType", "isLive", "publishAt", "publishedAt", "createdAt", "updatedAt")
SELECT 'it_' || substr(md5('venue:' || i."id"), 1, 24), i."id", i."venueId", NULL, NULL, 'VENUE'::"IssueTargetType", true, COALESCE(i."publishedAt", i."updatedAt", CURRENT_TIMESTAMP), i."publishedAt", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Issue" i
WHERE i."venueId" IS NOT NULL AND i."restroomId" IS NULL AND i."status" = 'PUBLISHED' AND i."isPublished" = true AND i."isArchived" = false
  AND NOT EXISTS (SELECT 1 FROM "IssueTarget" it WHERE it."issueId" = i."id" AND it."venueId" = i."venueId" AND it."targetType" = 'VENUE'::"IssueTargetType");

INSERT INTO "IssueTarget" ("id", "issueId", "venueId", "restroomId", "qrCodeId", "targetType", "isLive", "publishAt", "publishedAt", "createdAt", "updatedAt")
SELECT 'it_' || substr(md5('restroom:' || i."id"), 1, 24), i."id", i."venueId", i."restroomId", NULL, 'RESTROOM'::"IssueTargetType", true, COALESCE(i."publishedAt", i."updatedAt", CURRENT_TIMESTAMP), i."publishedAt", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Issue" i
WHERE i."venueId" IS NOT NULL AND i."restroomId" IS NOT NULL AND i."status" = 'PUBLISHED' AND i."isPublished" = true AND i."isArchived" = false
  AND NOT EXISTS (SELECT 1 FROM "IssueTarget" it WHERE it."issueId" = i."id" AND it."restroomId" = i."restroomId" AND it."targetType" = 'RESTROOM'::"IssueTargetType");

INSERT INTO "IssueTarget" ("id", "issueId", "venueId", "restroomId", "qrCodeId", "targetType", "isLive", "publishAt", "publishedAt", "createdAt", "updatedAt")
SELECT 'it_' || substr(md5('qr:' || i."id" || ':' || qc."id"), 1, 24), i."id", qc."venueId", i."restroomId", qc."id", 'QR_PLACEMENT'::"IssueTargetType", true, COALESCE(i."publishedAt", i."updatedAt", CURRENT_TIMESTAMP), i."publishedAt", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Issue" i
JOIN "qr_codes" qc ON qc."id" = i."qrCodeId"
WHERE qc."venueId" IS NOT NULL AND i."status" = 'PUBLISHED' AND i."isPublished" = true AND i."isArchived" = false
  AND NOT EXISTS (SELECT 1 FROM "IssueTarget" it WHERE it."issueId" = i."id" AND it."qrCodeId" = qc."id" AND it."targetType" = 'QR_PLACEMENT'::"IssueTargetType");

ALTER TABLE "IssueContentBlock" ADD COLUMN IF NOT EXISTS "headline" TEXT;
ALTER TABLE "IssueContentBlock" ADD COLUMN IF NOT EXISTS "sectionType" "ContentBlockType";
ALTER TABLE "IssueContentBlock" ADD COLUMN IF NOT EXISTS "isVisible" BOOLEAN NOT NULL DEFAULT true;
UPDATE "IssueContentBlock" SET "headline" = "title" WHERE "headline" IS NULL;
UPDATE "IssueContentBlock" SET "sectionType" = "type" WHERE "sectionType" IS NULL;
ALTER TABLE "IssueContentBlock" ALTER COLUMN "headline" SET NOT NULL;
ALTER TABLE "IssueContentBlock" ALTER COLUMN "sectionType" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "IssueContentBlock_issueId_sortOrder_idx" ON "IssueContentBlock"("issueId", "sortOrder");
