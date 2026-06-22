-- Neon default issue schema repair. Safe to run multiple times.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Issue') THEN
    ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "slug" TEXT;
    ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "subtitle" TEXT;
    ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "contextLabel" TEXT;
    CREATE INDEX IF NOT EXISTS "Issue_isDefault_idx" ON "Issue" ("isDefault");
    CREATE UNIQUE INDEX IF NOT EXISTS "Issue_slug_key" ON "Issue" ("slug") WHERE "slug" IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'IssueContentBlock') THEN
    ALTER TABLE "IssueContentBlock" ADD COLUMN IF NOT EXISTS "layoutKey" TEXT;
    ALTER TABLE "IssueContentBlock" ADD COLUMN IF NOT EXISTS "data" JSONB;
    ALTER TABLE "IssueContentBlock" ADD COLUMN IF NOT EXISTS "layout" JSONB;
    ALTER TABLE "IssueContentBlock" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;
    UPDATE "IssueContentBlock" SET "layoutKey" = COALESCE("layoutKey", "layout"->>'key', "data"->>'key') WHERE "layoutKey" IS NULL;
    CREATE INDEX IF NOT EXISTS "IssueContentBlock_issueId_sortOrder_idx" ON "IssueContentBlock" ("issueId", "sortOrder");
    CREATE INDEX IF NOT EXISTS "IssueContentBlock_layoutKey_idx" ON "IssueContentBlock" ("layoutKey");
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'IssueAdSlot') THEN
    ALTER TABLE "IssueAdSlot" ADD COLUMN IF NOT EXISTS "placement" TEXT;
    ALTER TABLE "IssueAdSlot" ADD COLUMN IF NOT EXISTS "adId" TEXT;
    ALTER TABLE "IssueAdSlot" ADD COLUMN IF NOT EXISTS "slotNumber" INTEGER NOT NULL DEFAULT 0;
    UPDATE "IssueAdSlot" SET "placement" = COALESCE("placement", 'slot-' || "slotNumber"::TEXT) WHERE "placement" IS NULL;
    CREATE INDEX IF NOT EXISTS "IssueAdSlot_placement_idx" ON "IssueAdSlot" ("placement");
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Ad') THEN
    ALTER TABLE "Ad" ADD COLUMN IF NOT EXISTS "creativeBrief" TEXT;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'StalltalkCampaignHistory') THEN
    ALTER TABLE "StalltalkCampaignHistory" ADD COLUMN IF NOT EXISTS "creativeBrief" TEXT;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'AdCampaign') THEN
    ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "creativeBrief" TEXT;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'AdCreative') THEN
    ALTER TABLE "AdCreative" ADD COLUMN IF NOT EXISTS "creativeBrief" TEXT;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'CouponCampaign') THEN
    ALTER TABLE "CouponCampaign" ADD COLUMN IF NOT EXISTS "creativeBrief" TEXT;
  END IF;
END $$;
