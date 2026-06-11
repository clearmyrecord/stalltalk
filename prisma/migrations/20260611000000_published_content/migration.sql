CREATE TABLE IF NOT EXISTS "PublishedContent" (
  "id" TEXT NOT NULL,
  "issue" JSONB NOT NULL,
  "ads" JSONB NOT NULL,
  "events" JSONB NOT NULL,
  "venues" JSONB NOT NULL,
  "settings" JSONB NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedBy" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublishedContent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PublishedContent_publishedAt_idx" ON "PublishedContent"("publishedAt");
