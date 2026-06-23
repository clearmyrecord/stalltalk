-- Guarded migration for custom venue/location issues, slugs, dynamic QR destinations, and ad targeting.
ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "publicUrl" TEXT;
ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "venueId" TEXT;
ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "restroomId" TEXT;
ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "isGlobalIssue" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "isVenueIssue" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "isLocationIssue" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "status" "IssueStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);
ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "Issue_slug_key" ON "Issue"("slug") WHERE "slug" IS NOT NULL;

ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "slug" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Venue_slug_key" ON "Venue"("slug") WHERE "slug" IS NOT NULL;
ALTER TABLE "Restroom" ADD COLUMN IF NOT EXISTS "slug" TEXT;
CREATE INDEX IF NOT EXISTS "Restroom_venue_slug_idx" ON "Restroom"("venueId", "slug");

DO $$ BEGIN
  CREATE TYPE "QrDestinationType" AS ENUM ('GLOBAL','VENUE','LOCATION','ISSUE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "destinationType" "QrDestinationType" NOT NULL DEFAULT 'GLOBAL';
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "destinationUrl" TEXT;
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "issueId" TEXT;
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "venueId" TEXT;
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "restroomId" TEXT;
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "last_scan_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "qr_codes_destination_idx" ON "qr_codes"("destinationType", "venueId", "restroomId", "issueId");

ALTER TABLE "stalltalk_campaign_history" ADD COLUMN IF NOT EXISTS "issueId" TEXT;
ALTER TABLE "stalltalk_campaign_history" ADD COLUMN IF NOT EXISTS "venueId" TEXT;
ALTER TABLE "stalltalk_campaign_history" ADD COLUMN IF NOT EXISTS "restroomId" TEXT;
ALTER TABLE "stalltalk_campaign_history" ADD COLUMN IF NOT EXISTS "placement" TEXT;
CREATE INDEX IF NOT EXISTS "stalltalk_campaign_history_issue_target_idx" ON "stalltalk_campaign_history"("issueId", "venueId", "restroomId");

-- Optional legacy tables if present.
DO $$ BEGIN
  IF to_regclass('public."PublishedAd"') IS NOT NULL THEN
    ALTER TABLE "PublishedAd" ADD COLUMN IF NOT EXISTS "issueId" TEXT;
    ALTER TABLE "PublishedAd" ADD COLUMN IF NOT EXISTS "venueId" TEXT;
    ALTER TABLE "PublishedAd" ADD COLUMN IF NOT EXISTS "restroomId" TEXT;
  END IF;
  IF to_regclass('public."CampaignHistory"') IS NOT NULL THEN
    ALTER TABLE "CampaignHistory" ADD COLUMN IF NOT EXISTS "issueId" TEXT;
    ALTER TABLE "CampaignHistory" ADD COLUMN IF NOT EXISTS "venueId" TEXT;
    ALTER TABLE "CampaignHistory" ADD COLUMN IF NOT EXISTS "restroomId" TEXT;
  END IF;
END $$;
