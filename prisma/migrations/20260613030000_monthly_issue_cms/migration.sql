-- Feature #9: Monthly Issue CMS
ALTER TABLE "Issue" ALTER COLUMN "venueId" DROP NOT NULL;
ALTER TYPE "ContentBlockType" ADD VALUE IF NOT EXISTS 'ANNOUNCEMENT';
ALTER TYPE "ContentBlockType" ADD VALUE IF NOT EXISTS 'SPONSOR_SLOT';

CREATE TABLE "IssueHistory" (
  "id" TEXT NOT NULL,
  "issueId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromStatus" "IssueStatus",
  "toStatus" "IssueStatus",
  "note" TEXT,
  "snapshot" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IssueHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IssueHistory_issueId_createdAt_idx" ON "IssueHistory"("issueId", "createdAt");
ALTER TABLE "IssueHistory" ADD CONSTRAINT "IssueHistory_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Issue_status_year_issueNumber_idx" ON "Issue"("status", "year", "issueNumber");
