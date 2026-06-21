ALTER TABLE "stalltalk_campaign_history" ADD COLUMN IF NOT EXISTS "targetType" TEXT;
ALTER TABLE "stalltalk_campaign_history" ADD COLUMN IF NOT EXISTS "targetLabel" TEXT;
CREATE INDEX IF NOT EXISTS "stalltalk_campaign_history_targetType_publishStatus_slotPublished_idx" ON "stalltalk_campaign_history"("targetType", "publishStatus", "slotPublished");
