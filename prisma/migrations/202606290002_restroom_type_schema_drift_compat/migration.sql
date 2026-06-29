-- Production compatibility repair for Restroom.restroomType.
--
-- Some deployed databases predate the venue restroom targeting migration and may
-- have older restroom gender/type columns instead of the Prisma field currently
-- queried by the venue portal. This migration is intentionally idempotent and
-- data-preserving: it creates the new columns when missing, maps known legacy
-- values into restroomType, then enforces the default/NOT NULL contract expected
-- by Prisma without resetting or truncating any data.

ALTER TABLE "Restroom" ADD COLUMN IF NOT EXISTS "restroomType" TEXT;
ALTER TABLE "Restroom" ADD COLUMN IF NOT EXISTS "customTypeLabel" TEXT;

DO $$
DECLARE
  legacy_column TEXT;
BEGIN
  -- Prefer explicit legacy restroom type/gender columns when they exist. The
  -- quoted names cover both Prisma camelCase history and SQL snake_case history.
  FOREACH legacy_column IN ARRAY ARRAY[
    'restroomGender',
    'restroom_gender',
    'gender',
    'restroom_type',
    'type'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'Restroom'
        AND column_name = legacy_column
    ) THEN
      EXECUTE format($sql$
        UPDATE "Restroom"
        SET "restroomType" = CASE
          WHEN upper(regexp_replace(coalesce(%1$I::text, ''), '[^A-Za-z0-9]+', '_', 'g')) IN ('M', 'MALE', 'MEN', 'MENS', 'MEN_S') THEN 'MEN'
          WHEN upper(regexp_replace(coalesce(%1$I::text, ''), '[^A-Za-z0-9]+', '_', 'g')) IN ('F', 'FEMALE', 'WOMEN', 'WOMENS', 'WOMEN_S') THEN 'WOMEN'
          WHEN upper(regexp_replace(coalesce(%1$I::text, ''), '[^A-Za-z0-9]+', '_', 'g')) IN ('FAMILY', 'FAMILY_RESTROOM') THEN 'FAMILY'
          WHEN upper(regexp_replace(coalesce(%1$I::text, ''), '[^A-Za-z0-9]+', '_', 'g')) IN ('STAFF', 'EMPLOYEE', 'EMPLOYEES') THEN 'STAFF'
          WHEN upper(regexp_replace(coalesce(%1$I::text, ''), '[^A-Za-z0-9]+', '_', 'g')) IN ('ALL_GENDER', 'ALLGENDER', 'GENDER_NEUTRAL', 'UNISEX', 'NEUTRAL') THEN 'ALL_GENDER'
          WHEN nullif(trim(%1$I::text), '') IS NOT NULL THEN 'CUSTOM'
          ELSE coalesce("restroomType", 'ALL_GENDER')
        END,
        "customTypeLabel" = CASE
          WHEN nullif(trim(%1$I::text), '') IS NOT NULL
           AND upper(regexp_replace(coalesce(%1$I::text, ''), '[^A-Za-z0-9]+', '_', 'g')) NOT IN (
             'M', 'MALE', 'MEN', 'MENS', 'MEN_S',
             'F', 'FEMALE', 'WOMEN', 'WOMENS', 'WOMEN_S',
             'FAMILY', 'FAMILY_RESTROOM',
             'STAFF', 'EMPLOYEE', 'EMPLOYEES',
             'ALL_GENDER', 'ALLGENDER', 'GENDER_NEUTRAL', 'UNISEX', 'NEUTRAL'
           )
          THEN coalesce("customTypeLabel", trim(%1$I::text))
          ELSE "customTypeLabel"
        END
        WHERE "restroomType" IS NULL OR "restroomType" = 'ALL_GENDER'
      $sql$, legacy_column);
    END IF;
  END LOOP;
END $$;

UPDATE "Restroom"
SET "restroomType" = 'ALL_GENDER'
WHERE "restroomType" IS NULL OR trim("restroomType") = '';

ALTER TABLE "Restroom" ALTER COLUMN "restroomType" SET DEFAULT 'ALL_GENDER';
ALTER TABLE "Restroom" ALTER COLUMN "restroomType" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "Restroom_venueId_restroomType_idx" ON "Restroom"("venueId", "restroomType");
