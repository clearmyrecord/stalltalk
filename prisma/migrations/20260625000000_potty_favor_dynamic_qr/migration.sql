CREATE TYPE "PottyFavorQrAssetStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'RETIRED');
CREATE TYPE "CampaignTargetType" AS ENUM ('sticker', 'restroom', 'venue', 'zip', 'city', 'state', 'default');

CREATE TABLE "potty_favor_qr_assets" (
  "id" TEXT NOT NULL,
  "qr_id" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "zip" TEXT NOT NULL,
  "venue_name" TEXT NOT NULL,
  "venue_slug" TEXT NOT NULL,
  "restroom_name" TEXT NOT NULL,
  "restroom_type" TEXT NOT NULL,
  "sticker_location" TEXT NOT NULL,
  "status" "PottyFavorQrAssetStatus" NOT NULL DEFAULT 'ACTIVE',
  "installed_at" TIMESTAMP(3),
  "current_campaign_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "potty_favor_qr_assets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "potty_favor_qr_assets_qr_id_key" ON "potty_favor_qr_assets"("qr_id");
CREATE INDEX "potty_favor_qr_assets_country_state_city_zip_idx" ON "potty_favor_qr_assets"("country", "state", "city", "zip");
CREATE INDEX "potty_favor_qr_assets_venue_slug_idx" ON "potty_favor_qr_assets"("venue_slug");
CREATE INDEX "potty_favor_qr_assets_current_campaign_id_idx" ON "potty_favor_qr_assets"("current_campaign_id");

CREATE TABLE "potty_favor_campaigns" (
  "id" TEXT NOT NULL,
  "advertiser_name" TEXT NOT NULL,
  "campaign_name" TEXT NOT NULL,
  "destination_url" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "start_date" TIMESTAMP(3),
  "end_date" TIMESTAMP(3),
  "target_type" "CampaignTargetType" NOT NULL,
  "target_value" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "potty_favor_campaigns_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "potty_favor_campaigns_active_target_type_target_value_idx" ON "potty_favor_campaigns"("active", "target_type", "target_value");

CREATE TABLE "potty_favor_scan_analytics" (
  "id" TEXT NOT NULL,
  "qr_id" TEXT NOT NULL,
  "campaign_id" TEXT,
  "venue_slug" TEXT NOT NULL,
  "zip" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "user_agent" TEXT,
  "referrer" TEXT,
  "device_type" TEXT,
  "browser" TEXT,
  "os" TEXT,
  CONSTRAINT "potty_favor_scan_analytics_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "potty_favor_scan_analytics_qr_id_timestamp_idx" ON "potty_favor_scan_analytics"("qr_id", "timestamp");
CREATE INDEX "potty_favor_scan_analytics_campaign_id_timestamp_idx" ON "potty_favor_scan_analytics"("campaign_id", "timestamp");
CREATE INDEX "potty_favor_scan_analytics_zip_timestamp_idx" ON "potty_favor_scan_analytics"("zip", "timestamp");
CREATE INDEX "potty_favor_scan_analytics_venue_slug_timestamp_idx" ON "potty_favor_scan_analytics"("venue_slug", "timestamp");
