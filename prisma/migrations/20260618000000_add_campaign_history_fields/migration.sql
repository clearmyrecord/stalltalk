-- Repair legacy Admin Ad Studio campaign history tables that were created
-- before campaign versioning / mobile sponsor fields were added to Prisma.
ALTER TABLE "stalltalk_campaign_history"
  ADD COLUMN IF NOT EXISTS "parentCampaignId" TEXT,
  ADD COLUMN IF NOT EXISTS "versionNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "targetUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "selectedSlot" INTEGER,
  ADD COLUMN IF NOT EXISTS "publishStatus" TEXT NOT NULL DEFAULT 'GENERATED',
  ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "logoBase64" TEXT,
  ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;

-- The original table already included these fields, but keep them guarded so
-- partially repaired databases match the current Prisma model exactly.
ALTER TABLE "stalltalk_campaign_history"
  ADD COLUMN IF NOT EXISTS "headline" TEXT,
  ADD COLUMN IF NOT EXISTS "subheadline" TEXT,
  ADD COLUMN IF NOT EXISTS "ctaText" TEXT,
  ADD COLUMN IF NOT EXISTS "couponCode" TEXT;

CREATE INDEX IF NOT EXISTS "stalltalk_campaign_history_parentCampaignId_versionNumber_idx"
  ON "stalltalk_campaign_history"("parentCampaignId", "versionNumber");
