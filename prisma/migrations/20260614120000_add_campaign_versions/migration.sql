ALTER TABLE "stalltalk_campaign_history"
  ADD COLUMN IF NOT EXISTS "parentCampaignId" TEXT,
  ADD COLUMN IF NOT EXISTS "versionNumber" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS "stalltalk_campaign_history_parentCampaignId_versionNumber_idx"
  ON "stalltalk_campaign_history"("parentCampaignId", "versionNumber");
