-- Analytics-ready counters for Potty Favor AI campaign publishing.
-- Guarded for Neon production safety.
ALTER TABLE "stalltalk_campaign_history"
  ADD COLUMN IF NOT EXISTS "viewCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "clickCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastViewedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastClickedAt" TIMESTAMP(3);

ALTER TABLE "Ad"
  ADD COLUMN IF NOT EXISTS "viewCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "clickCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastViewedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastClickedAt" TIMESTAMP(3);

ALTER TABLE "stalltalk_campaign_history" ALTER COLUMN "publishStatus" SET DEFAULT 'DRAFT';
