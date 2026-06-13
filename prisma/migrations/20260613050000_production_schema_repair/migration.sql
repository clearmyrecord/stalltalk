-- Production schema repair for partially applied Neon migrations.
-- Safe/idempotent: creates missing auth and platform objects, preserves existing qr_codes/QrCode data,
-- and never removes existing enum values or drops existing tables.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE','INACTIVE','SUSPENDED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TYPE "AccountStatus" ADD VALUE IF NOT EXISTS 'ACTIVE';
ALTER TYPE "AccountStatus" ADD VALUE IF NOT EXISTS 'INACTIVE';
ALTER TYPE "AccountStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';

DO $$ BEGIN CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN','ADMIN','VENUE_MANAGER','ADVERTISER','DISTRIBUTOR','VENUE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ADMIN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'VENUE_MANAGER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ADVERTISER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'DISTRIBUTOR';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'VENUE';

DO $$ BEGIN CREATE TYPE "QrCodeType" AS ENUM ('VENUE','RESTROOM','CAMPAIGN','TEST'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "QrStickerTemplate" AS ENUM ('STALL_DOOR','URINAL_WALL','TABLE_TENT','WINDOW_STICKER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "QrLifecycleAction" AS ENUM ('CREATE','PRINT','DEPLOY','REPLACE','RETIRE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "QrCodeStatus" AS ENUM ('DRAFT','PRINTED','DEPLOYED','ACTIVE','RETIRED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TYPE "QrCodeStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "QrCodeStatus" ADD VALUE IF NOT EXISTS 'PRINTED';
ALTER TYPE "QrCodeStatus" ADD VALUE IF NOT EXISTS 'DEPLOYED';
ALTER TYPE "QrCodeStatus" ADD VALUE IF NOT EXISTS 'ACTIVE';
ALTER TYPE "QrCodeStatus" ADD VALUE IF NOT EXISTS 'RETIRED';

-- If the legacy Prisma table exists and the mapped table does not, rename in-place so data is kept.
DO $$
BEGIN
  IF to_regclass('public."qr_codes"') IS NULL AND to_regclass('public."QrCode"') IS NOT NULL THEN
    ALTER TABLE "QrCode" RENAME TO "qr_codes";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
  "advertiserId" TEXT,
  "venueId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_role_status_idx" ON "User"("role", "status");

CREATE TABLE IF NOT EXISTS "AuthSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");
CREATE INDEX IF NOT EXISTS "AuthSession_userId_idx" ON "AuthSession"("userId");
CREATE INDEX IF NOT EXISTS "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");
DO $$ BEGIN ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "qr_codes" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "uuid" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "publisherId" TEXT NOT NULL,
  "venueId" TEXT,
  "restroomId" TEXT,
  "assignedDistributorId" TEXT,
  "qr_name" TEXT NOT NULL,
  "qr_slug" TEXT NOT NULL,
  "qr_url" TEXT NOT NULL,
  "qr_type" "QrCodeType" NOT NULL DEFAULT 'RESTROOM',
  "sticker_template" "QrStickerTemplate" NOT NULL DEFAULT 'STALL_DOOR',
  "short_url" TEXT,
  "call_to_action" TEXT NOT NULL DEFAULT 'Scan for Stall Talk',
  "status" "QrCodeStatus" NOT NULL DEFAULT 'DRAFT',
  "installed_at" TIMESTAMP(3),
  "last_scan_at" TIMESTAMP(3),
  "installation_photo_url" TEXT,
  "campaign_source" TEXT,
  "advertisement_source" TEXT,
  "promotion_source" TEXT,
  "coupon_source" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bring either newly-created or legacy-renamed QR table up to the Prisma-mapped shape without dropping data.
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "uuid" TEXT DEFAULT gen_random_uuid()::text;
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "assignedDistributorId" TEXT;
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "qr_type" "QrCodeType" NOT NULL DEFAULT 'RESTROOM';
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "sticker_template" "QrStickerTemplate" NOT NULL DEFAULT 'STALL_DOOR';
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "short_url" TEXT;
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "call_to_action" TEXT NOT NULL DEFAULT 'Scan for Stall Talk';
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "installed_at" TIMESTAMP(3);
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "last_scan_at" TIMESTAMP(3);
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "installation_photo_url" TEXT;
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "campaign_source" TEXT;
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "advertisement_source" TEXT;
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "promotion_source" TEXT;
ALTER TABLE "qr_codes" ADD COLUMN IF NOT EXISTS "coupon_source" TEXT;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qr_codes' AND column_name='code') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qr_codes' AND column_name='qr_slug') THEN ALTER TABLE "qr_codes" RENAME COLUMN "code" TO "qr_slug"; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qr_codes' AND column_name='label') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qr_codes' AND column_name='qr_name') THEN ALTER TABLE "qr_codes" RENAME COLUMN "label" TO "qr_name"; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qr_codes' AND column_name='destination') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qr_codes' AND column_name='qr_url') THEN ALTER TABLE "qr_codes" RENAME COLUMN "destination" TO "qr_url"; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qr_codes' AND column_name='createdAt') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qr_codes' AND column_name='created_at') THEN ALTER TABLE "qr_codes" RENAME COLUMN "createdAt" TO "created_at"; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qr_codes' AND column_name='updatedAt') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qr_codes' AND column_name='updated_at') THEN ALTER TABLE "qr_codes" RENAME COLUMN "updatedAt" TO "updated_at"; END IF; END $$;
UPDATE "qr_codes" SET "uuid" = gen_random_uuid()::text WHERE "uuid" IS NULL;
UPDATE "qr_codes" SET "short_url" = COALESCE("short_url", '/q/' || "qr_slug") WHERE "qr_slug" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "qr_codes_uuid_key" ON "qr_codes"("uuid");
CREATE UNIQUE INDEX IF NOT EXISTS "qr_codes_qr_slug_key" ON "qr_codes"("qr_slug");
CREATE INDEX IF NOT EXISTS "qr_codes_venueId_restroomId_status_idx" ON "qr_codes"("venueId", "restroomId", "status");
CREATE INDEX IF NOT EXISTS "qr_codes_qr_type_status_idx" ON "qr_codes"("qr_type", "status");

CREATE TABLE IF NOT EXISTS "qr_scans" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "qr_code_id" TEXT NOT NULL,
  "publisher_id" TEXT,
  "venue_id" TEXT,
  "restroom_id" TEXT,
  "issue_id" TEXT,
  "visitor_id" TEXT,
  "session_id" TEXT,
  "device_type" TEXT,
  "browser" TEXT,
  "operating_system" TEXT,
  "city" TEXT,
  "state" TEXT,
  "country" TEXT,
  "referral_source" TEXT,
  "campaign_source" TEXT,
  "advertisement_source" TEXT,
  "promotion_source" TEXT,
  "coupon_source" TEXT,
  "dwell_time_ms" INTEGER,
  "metadata" JSONB,
  "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "qr_scans_qr_code_id_scanned_at_idx" ON "qr_scans"("qr_code_id", "scanned_at");
CREATE INDEX IF NOT EXISTS "qr_scans_venue_id_scanned_at_idx" ON "qr_scans"("venue_id", "scanned_at");
DO $$ BEGIN ALTER TABLE "qr_scans" ADD CONSTRAINT "qr_scans_qr_code_id_fkey" FOREIGN KEY ("qr_code_id") REFERENCES "qr_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "qr_lifecycle_events" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "qr_code_id" TEXT NOT NULL,
  "action" "QrLifecycleAction" NOT NULL,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "qr_lifecycle_events_qr_code_id_created_at_idx" ON "qr_lifecycle_events"("qr_code_id", "created_at");
DO $$ BEGIN ALTER TABLE "qr_lifecycle_events" ADD CONSTRAINT "qr_lifecycle_events_qr_code_id_fkey" FOREIGN KEY ("qr_code_id") REFERENCES "qr_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Optional foreign keys only when parent tables exist; avoids failing on partially repaired databases.
DO $$ BEGIN IF to_regclass('public."Advertiser"') IS NOT NULL THEN ALTER TABLE "User" ADD CONSTRAINT "User_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "Advertiser"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN IF to_regclass('public."Venue"') IS NOT NULL THEN ALTER TABLE "User" ADD CONSTRAINT "User_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN IF to_regclass('public."Publisher"') IS NOT NULL THEN ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN IF to_regclass('public."Venue"') IS NOT NULL THEN ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN IF to_regclass('public."Restroom"') IS NOT NULL THEN ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_restroomId_fkey" FOREIGN KEY ("restroomId") REFERENCES "Restroom"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN IF to_regclass('public."Distributor"') IS NOT NULL THEN ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_assignedDistributorId_fkey" FOREIGN KEY ("assignedDistributorId") REFERENCES "Distributor"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Preserve legacy QR enum values if they already exist in production, but normalize rows to schema values.
UPDATE "qr_codes" SET "status" = 'DRAFT' WHERE "status"::text = 'INVENTORY';
UPDATE "qr_codes" SET "status" = 'ACTIVE' WHERE "status"::text = 'ASSIGNED';

-- Create commonly-missing platform tables from migrations that were manually marked applied.
DO $$ BEGIN CREATE TYPE "CreativeKind" AS ENUM ('IMAGE','COUPON','BANNER','SPONSORED_ARTICLE','RESTAURANT_PROMOTION','EVENT_PROMOTION'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TargetType" AS ENUM ('GLOBAL_NETWORK','STATE','CITY','VENUE','VENUE_TYPE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT','SENT','PAID','VOID'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CreativeApprovalStatus" AS ENUM ('DRAFT','SUBMITTED','APPROVED','REJECTED','FLAGGED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "InventoryStatus" AS ENUM ('OPEN','RESERVED','SOLD','DISABLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ApprovalStatus" AS ENUM ('DRAFT','SUBMITTED','PENDING','APPROVED','REJECTED','PUBLISHED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "VenueContentType" AS ENUM ('ANNOUNCEMENT','PROMOTION','EVENT','RESTAURANT_REVIEW','PHOTO','COUPON','FEATURED_CONTENT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "MediaAssetType" AS ENUM ('IMAGE','LOGO','GALLERY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "IssueStatus" AS ENUM ('DRAFT','SCHEDULED','PUBLISHED','ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ToiletLocation" ("id" TEXT NOT NULL PRIMARY KEY, "venueId" TEXT NOT NULL, "restroomId" TEXT, "qrCodeId" TEXT, "name" TEXT NOT NULL, "label" TEXT NOT NULL, "placement" TEXT, "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS "AdSlotInventory" ("id" TEXT NOT NULL PRIMARY KEY, "venueId" TEXT NOT NULL, "restroomId" TEXT, "qrCodeId" TEXT, "toiletLocationId" TEXT, "slotNumber" INTEGER NOT NULL, "month" TEXT NOT NULL, "startsAt" TIMESTAMP(3), "endsAt" TIMESTAMP(3), "priceCents" INTEGER NOT NULL DEFAULT 5000, "status" "InventoryStatus" NOT NULL DEFAULT 'OPEN', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS "AdCampaign" ("id" TEXT NOT NULL PRIMARY KEY, "advertiserId" TEXT NOT NULL, "inventoryId" TEXT, "adId" TEXT, "name" TEXT NOT NULL, "businessName" TEXT NOT NULL, "headline" TEXT NOT NULL, "body" TEXT NOT NULL, "description" TEXT, "creativeUrl" TEXT, "targetUrl" TEXT NOT NULL DEFAULT '#', "ctaText" TEXT NOT NULL DEFAULT 'Learn More', "months" INTEGER NOT NULL DEFAULT 1, "locationCount" INTEGER NOT NULL DEFAULT 1, "priceCents" INTEGER NOT NULL DEFAULT 5000, "budgetCents" INTEGER NOT NULL DEFAULT 0, "remainingBudgetCents" INTEGER NOT NULL DEFAULT 0, "flightStartMonth" TEXT NOT NULL DEFAULT '2026-07', "flightEndMonth" TEXT NOT NULL DEFAULT '2026-07', "flightMonths" INTEGER NOT NULL DEFAULT 1, "pricePerPlacementMonthCents" INTEGER NOT NULL DEFAULT 5000, "placementCount" INTEGER NOT NULL DEFAULT 1, "totalAmountCents" INTEGER NOT NULL DEFAULT 5000, "targetType" "TargetType" NOT NULL DEFAULT 'GLOBAL_NETWORK', "targetStates" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "targetCities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "targetVenueIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "targetVenueTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "impressionsServed" INTEGER NOT NULL DEFAULT 0, "clicksServed" INTEGER NOT NULL DEFAULT 0, "qrScans" INTEGER NOT NULL DEFAULT 0, "estimatedCpmCents" INTEGER NOT NULL DEFAULT 0, "estimatedCpcCents" INTEGER NOT NULL DEFAULT 0, "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS "AdCampaignPlacement" ("id" TEXT NOT NULL PRIMARY KEY, "campaignId" TEXT NOT NULL, "inventoryId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS "AdCreative" ("id" TEXT NOT NULL PRIMARY KEY, "campaignId" TEXT NOT NULL, "advertiserId" TEXT NOT NULL, "kind" "CreativeKind" NOT NULL DEFAULT 'IMAGE', "imageUrl" TEXT, "headline" TEXT NOT NULL, "body" TEXT NOT NULL, "callToAction" TEXT NOT NULL DEFAULT 'Learn More', "destinationUrl" TEXT NOT NULL DEFAULT '#', "approvalStatus" "CreativeApprovalStatus" NOT NULL DEFAULT 'SUBMITTED', "reviewNote" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS "AdvertiserInvoice" ("id" TEXT NOT NULL PRIMARY KEY, "advertiserId" TEXT NOT NULL, "campaignId" TEXT, "invoiceNumber" TEXT NOT NULL, "amountCents" INTEGER NOT NULL, "currency" TEXT NOT NULL DEFAULT 'usd', "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT', "stripeCustomerId" TEXT, "stripeInvoiceId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "paidAt" TIMESTAMP(3));
CREATE TABLE IF NOT EXISTS "Payment" ("id" TEXT NOT NULL PRIMARY KEY, "campaignId" TEXT NOT NULL, "advertiserId" TEXT NOT NULL, "amountCents" INTEGER NOT NULL, "currency" TEXT NOT NULL DEFAULT 'usd', "stripeSessionId" TEXT, "stripePaymentIntentId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS "VenueContentDraft" ("id" TEXT NOT NULL PRIMARY KEY, "venueId" TEXT NOT NULL, "contentType" "VenueContentType" NOT NULL DEFAULT 'ANNOUNCEMENT', "title" TEXT NOT NULL, "body" TEXT NOT NULL, "imageUrl" TEXT, "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS "VenueMediaAsset" ("id" TEXT NOT NULL PRIMARY KEY, "venueId" TEXT NOT NULL, "assetType" "MediaAssetType" NOT NULL DEFAULT 'IMAGE', "title" TEXT NOT NULL, "url" TEXT NOT NULL, "altText" TEXT, "galleryName" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS "restaurant_reviews" ("id" TEXT NOT NULL PRIMARY KEY, "publisherId" TEXT NOT NULL, "title" TEXT NOT NULL, "restaurant_name" TEXT NOT NULL, "venue_id" TEXT, "venue_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "featured_image_url" TEXT, "star_rating" DECIMAL(2,1) NOT NULL DEFAULT 5.0, "cuisine_type" TEXT, "address" TEXT, "city" TEXT, "state" TEXT, "website_url" TEXT, "instagram_url" TEXT, "facebook_url" TEXT, "review_headline" TEXT NOT NULL, "review_body" TEXT NOT NULL, "reviewer_name" TEXT NOT NULL, "publish_date" TIMESTAMP(3), "status" "IssueStatus" NOT NULL DEFAULT 'DRAFT', "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS "PublishedContent" ("id" TEXT NOT NULL PRIMARY KEY, "issue" JSONB NOT NULL, "ads" JSONB NOT NULL, "events" JSONB NOT NULL, "venues" JSONB NOT NULL, "settings" JSONB NOT NULL, "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "publishedBy" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);

CREATE UNIQUE INDEX IF NOT EXISTS "AdvertiserInvoice_invoiceNumber_key" ON "AdvertiserInvoice"("invoiceNumber");
CREATE INDEX IF NOT EXISTS "ToiletLocation_venueId_idx" ON "ToiletLocation"("venueId");
CREATE INDEX IF NOT EXISTS "AdSlotInventory_status_month_idx" ON "AdSlotInventory"("status", "month");
CREATE INDEX IF NOT EXISTS "AdCampaign_advertiserId_status_idx" ON "AdCampaign"("advertiserId", "approvalStatus");
CREATE UNIQUE INDEX IF NOT EXISTS "AdCampaignPlacement_campaignId_inventoryId_key" ON "AdCampaignPlacement"("campaignId", "inventoryId");
CREATE INDEX IF NOT EXISTS "AdCreative_advertiserId_approvalStatus_idx" ON "AdCreative"("advertiserId", "approvalStatus");
CREATE INDEX IF NOT EXISTS "VenueContentDraft_venueId_contentType_approvalStatus_idx" ON "VenueContentDraft"("venueId", "contentType", "approvalStatus");
CREATE INDEX IF NOT EXISTS "VenueMediaAsset_venueId_assetType_idx" ON "VenueMediaAsset"("venueId", "assetType");
CREATE INDEX IF NOT EXISTS "restaurant_reviews_publisherId_status_publish_date_idx" ON "restaurant_reviews"("publisherId", "status", "publish_date");
CREATE INDEX IF NOT EXISTS "PublishedContent_publishedAt_idx" ON "PublishedContent"("publishedAt");
