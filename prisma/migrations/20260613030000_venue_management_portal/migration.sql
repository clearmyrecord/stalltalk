ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'VENUE_MANAGER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'DISTRIBUTOR';
ALTER TYPE "ApprovalStatus" ADD VALUE IF NOT EXISTS 'PUBLISHED';
ALTER TYPE "AnalyticsEventType" ADD VALUE IF NOT EXISTS 'COUPON_CLICK';
ALTER TYPE "AnalyticsEventType" ADD VALUE IF NOT EXISTS 'ISSUE_VIEW';
ALTER TYPE "AnalyticsEventType" ADD VALUE IF NOT EXISTS 'WEBSITE_VISIT';
CREATE TYPE "VenueContentType" AS ENUM ('ANNOUNCEMENT', 'PROMOTION', 'EVENT', 'RESTAURANT_REVIEW', 'PHOTO', 'COUPON', 'FEATURED_CONTENT');
CREATE TYPE "VenuePromotionCategory" AS ENUM ('HAPPY_HOUR', 'RESTAURANT', 'RETAIL', 'HOTEL_PACKAGE', 'ENTERTAINMENT');
CREATE TYPE "MediaAssetType" AS ENUM ('IMAGE', 'LOGO', 'GALLERY');
ALTER TABLE "Venue" ADD COLUMN "directPublishingApproved" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "VenueContentDraft" ADD COLUMN "contentType" "VenueContentType" NOT NULL DEFAULT 'ANNOUNCEMENT', ADD COLUMN "location" TEXT, ADD COLUMN "websiteUrl" TEXT, ADD COLUMN "category" TEXT, ADD COLUMN "startsAt" TIMESTAMP(3), ADD COLUMN "endsAt" TIMESTAMP(3), ADD COLUMN "expiresAt" TIMESTAMP(3), ADD COLUMN "couponCode" TEXT, ADD COLUMN "qrDestination" TEXT, ADD COLUMN "publishedAt" TIMESTAMP(3);
CREATE INDEX "VenueContentDraft_venueId_contentType_approvalStatus_idx" ON "VenueContentDraft"("venueId", "contentType", "approvalStatus");
CREATE INDEX "VenueContentDraft_venueId_startsAt_endsAt_idx" ON "VenueContentDraft"("venueId", "startsAt", "endsAt");
CREATE TABLE "VenueMediaAsset" (
  "id" TEXT NOT NULL,
  "venueId" TEXT NOT NULL,
  "assetType" "MediaAssetType" NOT NULL DEFAULT 'IMAGE',
  "title" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "altText" TEXT,
  "galleryName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VenueMediaAsset_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VenueMediaAsset_venueId_assetType_idx" ON "VenueMediaAsset"("venueId", "assetType");
ALTER TABLE "VenueMediaAsset" ADD CONSTRAINT "VenueMediaAsset_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
