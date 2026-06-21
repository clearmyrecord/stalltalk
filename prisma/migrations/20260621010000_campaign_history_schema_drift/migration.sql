ALTER TABLE "stalltalk_campaign_history"
ADD COLUMN IF NOT EXISTS "parentCampaignId" TEXT,
ADD COLUMN IF NOT EXISTS "versionNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "targetUrl" TEXT,
ADD COLUMN IF NOT EXISTS "selectedSlot" INTEGER,
ADD COLUMN IF NOT EXISTS "slotPublished" INTEGER,
ADD COLUMN IF NOT EXISTS "publishStatus" TEXT NOT NULL DEFAULT 'DRAFT',
ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "logoBase64" TEXT,
ADD COLUMN IF NOT EXISTS "logoUrl" TEXT,
ADD COLUMN IF NOT EXISTS "headline" TEXT,
ADD COLUMN IF NOT EXISTS "subheadline" TEXT,
ADD COLUMN IF NOT EXISTS "ctaText" TEXT,
ADD COLUMN IF NOT EXISTS "couponCode" TEXT,
ADD COLUMN IF NOT EXISTS "viewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "clickCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lastViewedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "lastClickedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "targetType" TEXT,
ADD COLUMN IF NOT EXISTS "targetLabel" TEXT,
ADD COLUMN IF NOT EXISTS "publishedToHomepage" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "stalltalk_campaign_history_parentCampaignId_versionNumber_idx"
  ON "stalltalk_campaign_history"("parentCampaignId", "versionNumber");

CREATE INDEX IF NOT EXISTS "stalltalk_campaign_history_targetType_publishStatus_slotPublished_idx"
  ON "stalltalk_campaign_history"("targetType", "publishStatus", "slotPublished");
