ALTER TABLE "Restroom" ADD COLUMN IF NOT EXISTS "restroomType" TEXT NOT NULL DEFAULT 'ALL_GENDER';
ALTER TABLE "Restroom" ADD COLUMN IF NOT EXISTS "customTypeLabel" TEXT;
CREATE INDEX IF NOT EXISTS "Restroom_venueId_restroomType_idx" ON "Restroom"("venueId", "restroomType");
