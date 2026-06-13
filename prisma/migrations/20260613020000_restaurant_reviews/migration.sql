-- Feature #4: Restaurant Review Module
ALTER TYPE "ContentBlockType" ADD VALUE IF NOT EXISTS 'RESTAURANT_REVIEW';
ALTER TYPE "AnalyticsEventType" ADD VALUE IF NOT EXISTS 'REVIEW_VIEW';
ALTER TYPE "AnalyticsEventType" ADD VALUE IF NOT EXISTS 'REVIEW_WEBSITE_CLICK';
ALTER TYPE "AnalyticsEventType" ADD VALUE IF NOT EXISTS 'REVIEW_SOCIAL_CLICK';

CREATE TABLE "restaurant_reviews" (
  "id" TEXT NOT NULL,
  "publisherId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "restaurant_name" TEXT NOT NULL,
  "venue_id" TEXT,
  "venue_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "featured_image_url" TEXT,
  "star_rating" DECIMAL(2,1) NOT NULL DEFAULT 5.0,
  "cuisine_type" TEXT,
  "address" TEXT,
  "city" TEXT,
  "state" TEXT,
  "website_url" TEXT,
  "instagram_url" TEXT,
  "facebook_url" TEXT,
  "review_headline" TEXT NOT NULL,
  "review_body" TEXT NOT NULL,
  "reviewer_name" TEXT NOT NULL,
  "publish_date" TIMESTAMP(3),
  "status" "IssueStatus" NOT NULL DEFAULT 'DRAFT',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "restaurant_reviews_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "restaurant_reviews_publisherId_status_publish_date_idx" ON "restaurant_reviews"("publisherId", "status", "publish_date");
CREATE INDEX "restaurant_reviews_venue_id_idx" ON "restaurant_reviews"("venue_id");
ALTER TABLE "restaurant_reviews" ADD CONSTRAINT "restaurant_reviews_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "restaurant_reviews" ADD CONSTRAINT "restaurant_reviews_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
