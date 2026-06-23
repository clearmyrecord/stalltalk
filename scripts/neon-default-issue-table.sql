-- Neon production hotfix for the DefaultIssue table used by Vercel builds.
CREATE TABLE IF NOT EXISTS "DefaultIssue" (
  "id" TEXT NOT NULL DEFAULT ('default-public-issue'),
  "slug" TEXT NOT NULL DEFAULT 'default-public-issue',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "month" INTEGER NOT NULL DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
  "year" INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "issueJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DefaultIssue_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DefaultIssue" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "DefaultIssue" ADD COLUMN IF NOT EXISTS "month" INTEGER NOT NULL DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER;
ALTER TABLE "DefaultIssue" ADD COLUMN IF NOT EXISTS "year" INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
ALTER TABLE "DefaultIssue" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "DefaultIssue" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);
ALTER TABLE "DefaultIssue" ADD COLUMN IF NOT EXISTS "issueJson" JSONB;
ALTER TABLE "DefaultIssue" ALTER COLUMN "slug" SET DEFAULT 'default-public-issue';
ALTER TABLE "DefaultIssue" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "DefaultIssue" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX IF NOT EXISTS "DefaultIssue_slug_key" ON "DefaultIssue"("slug");

ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "defaultIssueId" TEXT;
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "defaultIssueId" TEXT;
ALTER TABLE "IssueContentBlock" ADD COLUMN IF NOT EXISTS "defaultIssueId" TEXT;
ALTER TABLE "stalltalk_campaign_history" ADD COLUMN IF NOT EXISTS "defaultIssueId" TEXT;

DO $$ BEGIN
  ALTER TABLE "Issue" ADD CONSTRAINT "Issue_defaultIssueId_fkey" FOREIGN KEY ("defaultIssueId") REFERENCES "DefaultIssue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Venue" ADD CONSTRAINT "Venue_defaultIssueId_fkey" FOREIGN KEY ("defaultIssueId") REFERENCES "DefaultIssue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "IssueContentBlock" ADD CONSTRAINT "IssueContentBlock_defaultIssueId_fkey" FOREIGN KEY ("defaultIssueId") REFERENCES "DefaultIssue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "stalltalk_campaign_history" ADD CONSTRAINT "stalltalk_campaign_history_defaultIssueId_fkey" FOREIGN KEY ("defaultIssueId") REFERENCES "DefaultIssue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO "DefaultIssue" ("id", "slug", "title", "month", "year", "status", "publishedAt", "issueJson")
VALUES ('default-public-issue', 'default-public-issue', 'Potty Favor Global Issue', EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 'PUBLISHED', CURRENT_TIMESTAMP, '{}'::jsonb)
ON CONFLICT ("slug") DO NOTHING;
