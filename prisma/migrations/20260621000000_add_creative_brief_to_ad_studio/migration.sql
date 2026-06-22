ALTER TABLE "Ad"
  ADD COLUMN IF NOT EXISTS "creativeBrief" TEXT;

ALTER TABLE "stalltalk_campaign_history"
  ADD COLUMN IF NOT EXISTS "creativeBrief" TEXT;

ALTER TABLE "AdCampaign"
  ADD COLUMN IF NOT EXISTS "creativeBrief" TEXT;
