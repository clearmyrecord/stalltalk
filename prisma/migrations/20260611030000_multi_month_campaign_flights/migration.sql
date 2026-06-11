-- Add campaign-flight pricing and placement metadata for multi-month advertiser bookings.
ALTER TABLE "AdCampaign"
  ADD COLUMN "flightStartMonth" TEXT NOT NULL DEFAULT '2026-07',
  ADD COLUMN "flightEndMonth" TEXT NOT NULL DEFAULT '2026-07',
  ADD COLUMN "flightMonths" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "pricePerPlacementMonthCents" INTEGER NOT NULL DEFAULT 5000,
  ADD COLUMN "placementCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "totalAmountCents" INTEGER NOT NULL DEFAULT 5000;

UPDATE "AdCampaign"
SET
  "flightStartMonth" = COALESCE(TO_CHAR("startsAt", 'YYYY-MM'), "flightStartMonth"),
  "flightEndMonth" = COALESCE(TO_CHAR("endsAt", 'YYYY-MM'), "flightEndMonth"),
  "flightMonths" = GREATEST(1, "months"),
  "placementCount" = GREATEST(1, "locationCount"),
  "totalAmountCents" = GREATEST(5000, "priceCents");

CREATE TABLE "AdCampaignPlacement" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "inventoryId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AdCampaignPlacement_pkey" PRIMARY KEY ("id")
);

INSERT INTO "AdCampaignPlacement" ("id", "campaignId", "inventoryId")
SELECT CONCAT('seed_', "id"), "id", "inventoryId"
FROM "AdCampaign"
WHERE "inventoryId" IS NOT NULL;

CREATE UNIQUE INDEX "AdCampaignPlacement_campaignId_inventoryId_key" ON "AdCampaignPlacement"("campaignId", "inventoryId");
CREATE INDEX "AdCampaignPlacement_inventoryId_idx" ON "AdCampaignPlacement"("inventoryId");
CREATE INDEX "AdCampaign_flightStartMonth_flightEndMonth_idx" ON "AdCampaign"("flightStartMonth", "flightEndMonth");

ALTER TABLE "AdCampaignPlacement" ADD CONSTRAINT "AdCampaignPlacement_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdCampaignPlacement" ADD CONSTRAINT "AdCampaignPlacement_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "AdSlotInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
