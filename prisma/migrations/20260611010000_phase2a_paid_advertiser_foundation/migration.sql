-- CreateEnum
-- Defensive wrappers keep production recovery idempotent when this migration
-- partially applied before Prisma recorded it successfully.
DO $$ BEGIN CREATE TYPE "Role" AS ENUM ('ADMIN', 'ADVERTISER', 'VENUE'); EXCEPTION WHEN duplicate_object THEN null; END $$;
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ADMIN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ADVERTISER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'VENUE';

-- CreateEnum
DO $$ BEGIN CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'PAID', 'ACTIVE', 'REJECTED', 'ARCHIVED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
ALTER TYPE "CampaignStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "CampaignStatus" ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT';
ALTER TYPE "CampaignStatus" ADD VALUE IF NOT EXISTS 'PAID';
ALTER TYPE "CampaignStatus" ADD VALUE IF NOT EXISTS 'ACTIVE';
ALTER TYPE "CampaignStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "CampaignStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

-- CreateEnum
DO $$ BEGIN CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'SUCCEEDED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'FAILED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';

-- CreateEnum
DO $$ BEGIN CREATE TYPE "InventoryStatus" AS ENUM ('OPEN', 'RESERVED', 'SOLD', 'DISABLED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
ALTER TYPE "InventoryStatus" ADD VALUE IF NOT EXISTS 'OPEN';
ALTER TYPE "InventoryStatus" ADD VALUE IF NOT EXISTS 'RESERVED';
ALTER TYPE "InventoryStatus" ADD VALUE IF NOT EXISTS 'SOLD';
ALTER TYPE "InventoryStatus" ADD VALUE IF NOT EXISTS 'DISABLED';

-- CreateEnum
DO $$ BEGIN CREATE TYPE "ApprovalStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
ALTER TYPE "ApprovalStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "ApprovalStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "ApprovalStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "ApprovalStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "advertiserId" TEXT,
    "venueId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AuthSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ToiletLocation" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "restroomId" TEXT,
    "qrCodeId" TEXT,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "placement" TEXT,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToiletLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AdSlotInventory" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "restroomId" TEXT,
    "qrCodeId" TEXT,
    "toiletLocationId" TEXT,
    "slotNumber" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "priceCents" INTEGER NOT NULL DEFAULT 5000,
    "status" "InventoryStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdSlotInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AdCampaign" (
    "id" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "inventoryId" TEXT,
    "adId" TEXT,
    "name" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "creativeUrl" TEXT,
    "targetUrl" TEXT NOT NULL DEFAULT '#',
    "ctaText" TEXT NOT NULL DEFAULT 'Learn More',
    "months" INTEGER NOT NULL DEFAULT 1,
    "locationCount" INTEGER NOT NULL DEFAULT 1,
    "priceCents" INTEGER NOT NULL DEFAULT 5000,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "adminApprovalNote" TEXT,
    "stripeSessionId" TEXT,
    "paidAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "VenueContentDraft" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueContentDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ToiletLocation_venueId_idx" ON "ToiletLocation"("venueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ToiletLocation_restroomId_idx" ON "ToiletLocation"("restroomId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ToiletLocation_qrCodeId_idx" ON "ToiletLocation"("qrCodeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdSlotInventory_status_month_idx" ON "AdSlotInventory"("status", "month");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AdSlotInventory_venueId_restroomId_qrCodeId_slotNumber_mont_key" ON "AdSlotInventory"("venueId", "restroomId", "qrCodeId", "slotNumber", "month");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AdCampaign_stripeSessionId_key" ON "AdCampaign"("stripeSessionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdCampaign_advertiserId_status_idx" ON "AdCampaign"("advertiserId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdCampaign_inventoryId_idx" ON "AdCampaign"("inventoryId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_stripeSessionId_key" ON "Payment"("stripeSessionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payment_campaignId_idx" ON "Payment"("campaignId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payment_advertiserId_idx" ON "Payment"("advertiserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VenueContentDraft_venueId_approvalStatus_idx" ON "VenueContentDraft"("venueId", "approvalStatus");

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "User" ADD CONSTRAINT "User_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "Advertiser"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "User" ADD CONSTRAINT "User_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "ToiletLocation" ADD CONSTRAINT "ToiletLocation_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "ToiletLocation" ADD CONSTRAINT "ToiletLocation_restroomId_fkey" FOREIGN KEY ("restroomId") REFERENCES "Restroom"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "ToiletLocation" ADD CONSTRAINT "ToiletLocation_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "QrCode"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "AdSlotInventory" ADD CONSTRAINT "AdSlotInventory_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "AdSlotInventory" ADD CONSTRAINT "AdSlotInventory_restroomId_fkey" FOREIGN KEY ("restroomId") REFERENCES "Restroom"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "AdSlotInventory" ADD CONSTRAINT "AdSlotInventory_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "QrCode"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "AdSlotInventory" ADD CONSTRAINT "AdSlotInventory_toiletLocationId_fkey" FOREIGN KEY ("toiletLocationId") REFERENCES "ToiletLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "Advertiser"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "AdSlotInventory"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "Payment" ADD CONSTRAINT "Payment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "Payment" ADD CONSTRAINT "Payment_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "Advertiser"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "VenueContentDraft" ADD CONSTRAINT "VenueContentDraft_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;

