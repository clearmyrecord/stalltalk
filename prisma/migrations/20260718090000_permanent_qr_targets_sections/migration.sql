-- Permanent QR routing, issue targets, and accessible issue section ordering.
CREATE TYPE "IssueTargetType" AS ENUM ('VENUE', 'RESTROOM', 'QR_PLACEMENT');
CREATE TYPE "QrPlacementType" AS ENUM ('STALL', 'MIRROR', 'URINAL', 'ENTRANCE', 'OTHER');

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
CREATE UNIQUE INDEX IF NOT EXISTS "IssueTarget_live_venue_unique" ON "IssueTarget"("venueId") WHERE "targetType" = 'VENUE' AND "isLive" = true;
CREATE UNIQUE INDEX IF NOT EXISTS "IssueTarget_live_restroom_unique" ON "IssueTarget"("restroomId") WHERE "targetType" = 'RESTROOM' AND "isLive" = true;
CREATE UNIQUE INDEX IF NOT EXISTS "IssueTarget_live_qr_unique" ON "IssueTarget"("qrCodeId") WHERE "targetType" = 'QR_PLACEMENT' AND "isLive" = true;


INSERT INTO "IssueTarget" ("id", "issueId", "venueId", "restroomId", "qrCodeId", "targetType", "isLive", "publishedAt", "createdAt", "updatedAt")
SELECT 'it_' || substr(md5(random()::text || x."id"), 1, 24), x."id", x."venueId", NULL, NULL, 'VENUE'::"IssueTargetType", true, COALESCE(x."publishedAt", x."updatedAt"), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (SELECT DISTINCT ON (i."venueId") i.* FROM "Issue" i WHERE i."venueId" IS NOT NULL AND i."restroomId" IS NULL AND i."status" = 'PUBLISHED' AND i."isPublished" = true AND i."isArchived" = false ORDER BY i."venueId", i."publishedAt" DESC NULLS LAST, i."updatedAt" DESC) x
ON CONFLICT DO NOTHING;

INSERT INTO "IssueTarget" ("id", "issueId", "venueId", "restroomId", "qrCodeId", "targetType", "isLive", "publishedAt", "createdAt", "updatedAt")
SELECT 'it_' || substr(md5(random()::text || x."id"), 1, 24), x."id", x."venueId", x."restroomId", NULL, 'RESTROOM'::"IssueTargetType", true, COALESCE(x."publishedAt", x."updatedAt"), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (SELECT DISTINCT ON (i."restroomId") i.* FROM "Issue" i WHERE i."venueId" IS NOT NULL AND i."restroomId" IS NOT NULL AND i."status" = 'PUBLISHED' AND i."isPublished" = true AND i."isArchived" = false ORDER BY i."restroomId", i."publishedAt" DESC NULLS LAST, i."updatedAt" DESC) x
ON CONFLICT DO NOTHING;

INSERT INTO "IssueTarget" ("id", "issueId", "venueId", "restroomId", "qrCodeId", "targetType", "isLive", "publishedAt", "createdAt", "updatedAt")
SELECT 'it_' || substr(md5(random()::text || x."id"), 1, 24), x."id", x."qrVenueId", x."restroomId", x."qrTargetId", 'QR_PLACEMENT'::"IssueTargetType", true, COALESCE(x."publishedAt", x."updatedAt"), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (SELECT DISTINCT ON (qc."id") i.*, qc."id" as "qrTargetId", qc."venueId" as "qrVenueId" FROM "Issue" i JOIN "qr_codes" qc ON qc."id" = i."qrCodeId" WHERE qc."venueId" IS NOT NULL AND i."status" = 'PUBLISHED' AND i."isPublished" = true AND i."isArchived" = false ORDER BY qc."id", i."publishedAt" DESC NULLS LAST, i."updatedAt" DESC) x
ON CONFLICT DO NOTHING;

ALTER TABLE "IssueContentBlock" ADD COLUMN IF NOT EXISTS "headline" TEXT;
ALTER TABLE "IssueContentBlock" ADD COLUMN IF NOT EXISTS "sectionType" "ContentBlockType";
ALTER TABLE "IssueContentBlock" ADD COLUMN IF NOT EXISTS "isVisible" BOOLEAN NOT NULL DEFAULT true;
UPDATE "IssueContentBlock" SET "headline" = "title" WHERE "headline" IS NULL;
UPDATE "IssueContentBlock" SET "sectionType" = "type" WHERE "sectionType" IS NULL;
ALTER TABLE "IssueContentBlock" ALTER COLUMN "headline" SET NOT NULL;
ALTER TABLE "IssueContentBlock" ALTER COLUMN "sectionType" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "IssueContentBlock_issueId_sortOrder_idx" ON "IssueContentBlock"("issueId", "sortOrder");
