ALTER TABLE "restaurant_reviews" ADD COLUMN "photo_url" TEXT;
UPDATE "restaurant_reviews" SET "photo_url" = "featured_image_url" WHERE "photo_url" IS NULL AND "featured_image_url" IS NOT NULL;
