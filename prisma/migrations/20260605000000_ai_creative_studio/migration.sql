ALTER TABLE "Ad"
  ADD COLUMN "creativeType" TEXT NOT NULL DEFAULT 'IMAGE',
  ADD COLUMN "htmlCreative" TEXT,
  ADD COLUMN "videoUrl" TEXT,
  ADD COLUMN "promptUsed" TEXT,
  ADD COLUMN "generatedHeadline" TEXT,
  ADD COLUMN "generatedSubheadline" TEXT,
  ADD COLUMN "adSize" TEXT;

CREATE TABLE "stalltalk_campaign_history" (
  "id" TEXT NOT NULL,
  "publisherId" TEXT,
  "advertiserId" TEXT,
  "adId" TEXT,
  "campaignId" TEXT NOT NULL,
  "business" TEXT NOT NULL,
  "image" TEXT,
  "prompt" TEXT NOT NULL,
  "headline" TEXT,
  "subheadline" TEXT,
  "ctaText" TEXT,
  "couponCode" TEXT,
  "adSize" TEXT NOT NULL DEFAULT 'Banner',
  "slotPublished" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "stalltalk_campaign_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "stalltalk_ad_slots" (
  "id" TEXT NOT NULL,
  "slotNumber" INTEGER NOT NULL,
  "publisherId" TEXT,
  "adId" TEXT,
  "business" TEXT NOT NULL,
  "creativeType" TEXT NOT NULL DEFAULT 'IMAGE',
  "image" TEXT,
  "htmlCreative" TEXT,
  "videoUrl" TEXT,
  "prompt" TEXT,
  "headline" TEXT,
  "subheadline" TEXT,
  "ctaText" TEXT,
  "couponCode" TEXT,
  "targetUrl" TEXT,
  "phone" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "stalltalk_ad_slots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stalltalk_campaign_history_campaignId_key" ON "stalltalk_campaign_history"("campaignId");
CREATE UNIQUE INDEX "stalltalk_ad_slots_slotNumber_key" ON "stalltalk_ad_slots"("slotNumber");

ALTER TABLE "stalltalk_campaign_history" ADD CONSTRAINT "stalltalk_campaign_history_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stalltalk_campaign_history" ADD CONSTRAINT "stalltalk_campaign_history_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "Advertiser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stalltalk_campaign_history" ADD CONSTRAINT "stalltalk_campaign_history_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stalltalk_ad_slots" ADD CONSTRAINT "stalltalk_ad_slots_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stalltalk_ad_slots" ADD CONSTRAINT "stalltalk_ad_slots_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
