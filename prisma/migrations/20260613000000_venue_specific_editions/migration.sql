-- Feature #3: Venue-specific editions and multi-venue targeting.
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "venue_type" TEXT NOT NULL DEFAULT 'venue';
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "venueIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "IssueContentBlock" ADD COLUMN IF NOT EXISTS "venueIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Ad" ADD COLUMN IF NOT EXISTS "venueIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS "Venue_slug_is_active_idx" ON "Venue"("slug", "is_active");
CREATE INDEX IF NOT EXISTS "IssueContentBlock_venueIds_idx" ON "IssueContentBlock" USING GIN ("venueIds");
CREATE INDEX IF NOT EXISTS "Article_venueIds_idx" ON "Article" USING GIN ("venueIds");
CREATE INDEX IF NOT EXISTS "Ad_venueIds_idx" ON "Ad" USING GIN ("venueIds");
