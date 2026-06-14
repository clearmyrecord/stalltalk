ALTER TABLE "stalltalk_campaign_history" ADD COLUMN IF NOT EXISTS "logoBase64" TEXT;
ALTER TABLE "stalltalk_campaign_history" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE "stalltalk_campaign_history" ADD COLUMN IF NOT EXISTS "targetUrl" TEXT;
ALTER TABLE "stalltalk_campaign_history" ADD COLUMN IF NOT EXISTS "selectedSlot" INTEGER;
ALTER TABLE "stalltalk_campaign_history" ADD COLUMN IF NOT EXISTS "publishStatus" TEXT NOT NULL DEFAULT 'GENERATED';
ALTER TABLE "stalltalk_campaign_history" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);
ALTER TABLE "stalltalk_campaign_history" ALTER COLUMN "adSize" SET DEFAULT 'Mobile Sponsor Card';
