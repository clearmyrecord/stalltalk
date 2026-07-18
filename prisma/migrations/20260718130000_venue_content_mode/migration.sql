-- Venue-selectable editorial content mode and explicit issue editorial scope.
-- Safe/non-destructive: adds enums and nullable/defaulted columns, then backfills.
DO $$ BEGIN
  CREATE TYPE "VenueContentMode" AS ENUM ('PUBLIC', 'VENUE_CUSTOM');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "IssueEditorialScope" AS ENUM ('PUBLIC_NETWORK', 'VENUE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "contentMode" "VenueContentMode" NOT NULL DEFAULT 'PUBLIC';
UPDATE "Venue" SET "contentMode" = 'PUBLIC' WHERE "contentMode" IS NULL;

ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "editorialScope" "IssueEditorialScope" NOT NULL DEFAULT 'VENUE';
UPDATE "Issue"
SET "editorialScope" = CASE
  WHEN "venueId" IS NULL OR "isGlobalIssue" = true THEN 'PUBLIC_NETWORK'::"IssueEditorialScope"
  ELSE 'VENUE'::"IssueEditorialScope"
END
WHERE "editorialScope" IS NULL OR "editorialScope" = 'VENUE';

CREATE INDEX IF NOT EXISTS "Issue_editorialScope_status_publishedAt_idx" ON "Issue"("editorialScope", "status", "publishedAt");
CREATE INDEX IF NOT EXISTS "Venue_contentMode_idx" ON "Venue"("contentMode");
