-- Make advertiser route inventory columns explicit for production schemas.
ALTER TABLE "AdSlotInventory" ADD COLUMN IF NOT EXISTS "issueId" TEXT;
ALTER TABLE "AdSlotInventory" ADD COLUMN IF NOT EXISTS "audienceSegment" TEXT NOT NULL DEFAULT 'ALL_RESTROOMS';
ALTER TABLE "AdSlotInventory" ADD COLUMN IF NOT EXISTS "eventCategory" TEXT;
ALTER TABLE "AdSlotInventory" ADD COLUMN IF NOT EXISTS "locationLabel" TEXT;
ALTER TABLE "AdSlotInventory" ADD COLUMN IF NOT EXISTS "gender" TEXT;

DO $$ BEGIN
  ALTER TABLE "AdSlotInventory" ADD CONSTRAINT "AdSlotInventory_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "AdSlotInventory_audienceSegment_idx" ON "AdSlotInventory"("audienceSegment");
CREATE INDEX IF NOT EXISTS "AdSlotInventory_issueId_status_idx" ON "AdSlotInventory"("issueId", "status");
CREATE INDEX IF NOT EXISTS "AdSlotInventory_issueId_month_qrCodeId_status_idx" ON "AdSlotInventory"("issueId", "month", "qrCodeId", "status");
