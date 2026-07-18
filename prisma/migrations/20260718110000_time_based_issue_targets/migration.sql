-- Time-based venue issue scheduling for permanent QR routes.
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "timeZone" TEXT NOT NULL DEFAULT 'America/Los_Angeles';
UPDATE "Venue" SET "timeZone" = 'America/Los_Angeles' WHERE "timeZone" IS NULL OR "timeZone" = '' OR lower("city") IN ('las vegas', 'north las vegas', 'henderson') OR "state" IN ('NV', 'Nevada');

ALTER TABLE "IssueTarget" ADD COLUMN IF NOT EXISTS "publishAt" TIMESTAMP(3);
ALTER TABLE "IssueTarget" ADD COLUMN IF NOT EXISTS "unpublishAt" TIMESTAMP(3);
ALTER TABLE "IssueTarget" ADD COLUMN IF NOT EXISTS "canceledAt" TIMESTAMP(3);
UPDATE "IssueTarget" SET "publishAt" = COALESCE("publishedAt", "createdAt") WHERE "publishAt" IS NULL;
ALTER TABLE "IssueTarget" ALTER COLUMN "publishAt" SET NOT NULL;

DROP INDEX IF EXISTS "IssueTarget_live_venue_unique";
DROP INDEX IF EXISTS "IssueTarget_live_restroom_unique";
DROP INDEX IF EXISTS "IssueTarget_live_qr_unique";
CREATE INDEX IF NOT EXISTS "IssueTarget_venue_schedule_idx" ON "IssueTarget"("venueId", "targetType", "publishAt");
CREATE INDEX IF NOT EXISTS "IssueTarget_restroom_schedule_idx" ON "IssueTarget"("restroomId", "targetType", "publishAt");
CREATE INDEX IF NOT EXISTS "IssueTarget_qr_schedule_idx" ON "IssueTarget"("qrCodeId", "targetType", "publishAt");
