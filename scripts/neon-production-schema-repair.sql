-- Safe Neon production Prisma schema drift repair for clearmyrecord/stalltalk.
-- This script is intentionally idempotent and data-preserving:
-- - it never resets, truncates, or drops application tables;
-- - it adds missing columns with IF NOT EXISTS;
-- - it normalizes duplicate/conflicting indexes and foreign keys before adding the Prisma-expected names.

BEGIN;

-- Ensure pgcrypto exists for gen_random_uuid() defaults used by historical qr_codes repairs.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- DefaultIssue drift: production may have the table without newer columns.
CREATE TABLE IF NOT EXISTS "DefaultIssue" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL DEFAULT 'default-public-issue',
  "title" TEXT NOT NULL DEFAULT 'Default Public Issue',
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
ALTER TABLE "DefaultIssue" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "DefaultIssue" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "DefaultIssue" ALTER COLUMN "slug" SET DEFAULT 'default-public-issue';
ALTER TABLE "DefaultIssue" ALTER COLUMN "title" SET DEFAULT 'Default Public Issue';
ALTER TABLE "DefaultIssue" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "DefaultIssue" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX IF NOT EXISTS "DefaultIssue_slug_key" ON "DefaultIssue"("slug");

INSERT INTO "DefaultIssue" ("id", "slug", "title", "description", "month", "year", "status", "publishedAt", "issueJson")
VALUES (
  'default-public-issue',
  'default-public-issue',
  'Default Public Issue',
  'Fallback public issue used when a venue-specific issue is not selected.',
  EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
  EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  'PUBLISHED',
  CURRENT_TIMESTAMP,
  '{}'::jsonb
)
ON CONFLICT ("slug") DO UPDATE SET
  "description" = COALESCE("DefaultIssue"."description", EXCLUDED."description"),
  "updatedAt" = CURRENT_TIMESTAMP;

-- Venue drift: production may be missing the nullable DefaultIssue relation column.
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "defaultIssueId" TEXT;
ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "defaultIssueId" TEXT;
CREATE INDEX IF NOT EXISTS "Venue_defaultIssueId_idx" ON "Venue"("defaultIssueId");
CREATE INDEX IF NOT EXISTS "Issue_defaultIssueId_idx" ON "Issue"("defaultIssueId");

-- Issue slug drift: previous hotfixes created a partial unique index with the Prisma index name.
-- Prisma expects a normal unique index for @unique, and db push fails if the name is already taken.
DO $$
DECLARE
  issue_slug_index_def TEXT;
BEGIN
  SELECT pg_get_indexdef(i.indexrelid)
    INTO issue_slug_index_def
  FROM pg_index i
  JOIN pg_class idx ON idx.oid = i.indexrelid
  JOIN pg_class tbl ON tbl.oid = i.indrelid
  JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
  WHERE ns.nspname = 'public'
    AND tbl.relname = 'Issue'
    AND idx.relname = 'Issue_slug_key'
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint c WHERE c.conindid = i.indexrelid
    );

  IF issue_slug_index_def IS NOT NULL AND issue_slug_index_def ILIKE '% WHERE %' THEN
    IF to_regclass('public."Issue_slug_key_partial_legacy"') IS NULL THEN
      ALTER INDEX "Issue_slug_key" RENAME TO "Issue_slug_key_partial_legacy";
    ELSE
      DROP INDEX "Issue_slug_key";
    END IF;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Issue_slug_key" ON "Issue"("slug");

-- Helper for idempotently adding a foreign key only when an equivalent relationship is absent.
CREATE OR REPLACE FUNCTION pg_temp.add_fk_if_missing(
  p_table regclass,
  p_constraint_name text,
  p_columns text[],
  p_ref_table regclass,
  p_ref_columns text[],
  p_delete_rule text,
  p_update_rule text
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  table_name text := p_table::text;
  ref_table_name text := p_ref_table::text;
  column_list text;
  ref_column_list text;
  existing_equivalent boolean;
BEGIN
  SELECT string_agg(format('%I', c), ', ') INTO column_list FROM unnest(p_columns) AS c;
  SELECT string_agg(format('%I', c), ', ') INTO ref_column_list FROM unnest(p_ref_columns) AS c;

  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint fk
    WHERE fk.contype = 'f'
      AND fk.conrelid = p_table
      AND fk.confrelid = p_ref_table
      AND fk.conkey = ARRAY(
        SELECT attnum FROM pg_attribute
        WHERE attrelid = p_table AND attname = ANY (p_columns)
        ORDER BY array_position(p_columns, attname)
      )::smallint[]
      AND fk.confkey = ARRAY(
        SELECT attnum FROM pg_attribute
        WHERE attrelid = p_ref_table AND attname = ANY (p_ref_columns)
        ORDER BY array_position(p_ref_columns, attname)
      )::smallint[]
  ) INTO existing_equivalent;

  IF NOT existing_equivalent THEN
    EXECUTE format(
      'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%s) REFERENCES %s (%s) ON DELETE %s ON UPDATE %s',
      table_name,
      p_constraint_name,
      column_list,
      ref_table_name,
      ref_column_list,
      p_delete_rule,
      p_update_rule
    );
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Drop duplicate qr_codes foreign keys that point from the same columns to the same referenced columns.
-- Keep the oldest constraint in each duplicate set, preferring Prisma's expected names when present.
DO $$
DECLARE
  duplicate_constraint record;
BEGIN
  IF to_regclass('public."qr_codes"') IS NOT NULL THEN
    FOR duplicate_constraint IN
      WITH ranked AS (
        SELECT
          c.oid,
          c.conname,
          row_number() OVER (
            PARTITION BY c.conrelid, c.conkey, c.confrelid, c.confkey
            ORDER BY
              CASE
                WHEN c.conname IN (
                  'qr_codes_publisherId_fkey',
                  'qr_codes_venueId_fkey',
                  'qr_codes_restroomId_fkey',
                  'qr_codes_assignedDistributorId_fkey'
                ) THEN 0
                ELSE 1
              END,
              c.oid
          ) AS keep_rank
        FROM pg_constraint c
        WHERE c.contype = 'f'
          AND c.conrelid = 'public."qr_codes"'::regclass
                )
      SELECT conname FROM ranked WHERE keep_rank > 1
    LOOP
      EXECUTE format('ALTER TABLE "qr_codes" DROP CONSTRAINT IF EXISTS %I', duplicate_constraint.conname);
    END LOOP;
  END IF;
END $$;

-- Add expected DefaultIssue and qr_codes foreign keys only if equivalent relationships are not already present.
SELECT pg_temp.add_fk_if_missing('public."Venue"'::regclass, 'Venue_defaultIssueId_fkey', ARRAY['defaultIssueId'], 'public."DefaultIssue"'::regclass, ARRAY['id'], 'SET NULL', 'CASCADE');
SELECT pg_temp.add_fk_if_missing('public."Issue"'::regclass, 'Issue_defaultIssueId_fkey', ARRAY['defaultIssueId'], 'public."DefaultIssue"'::regclass, ARRAY['id'], 'SET NULL', 'CASCADE');

DO $$
BEGIN
  IF to_regclass('public."qr_codes"') IS NOT NULL THEN
    IF to_regclass('public."Publisher"') IS NOT NULL
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'qr_codes' AND column_name = 'publisherId') THEN
      PERFORM pg_temp.add_fk_if_missing('public."qr_codes"'::regclass, 'qr_codes_publisherId_fkey', ARRAY['publisherId'], 'public."Publisher"'::regclass, ARRAY['id'], 'CASCADE', 'CASCADE');
    END IF;

    IF to_regclass('public."Venue"') IS NOT NULL
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'qr_codes' AND column_name = 'venueId') THEN
      PERFORM pg_temp.add_fk_if_missing('public."qr_codes"'::regclass, 'qr_codes_venueId_fkey', ARRAY['venueId'], 'public."Venue"'::regclass, ARRAY['id'], 'SET NULL', 'CASCADE');
    END IF;

    IF to_regclass('public."Restroom"') IS NOT NULL
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'qr_codes' AND column_name = 'restroomId') THEN
      PERFORM pg_temp.add_fk_if_missing('public."qr_codes"'::regclass, 'qr_codes_restroomId_fkey', ARRAY['restroomId'], 'public."Restroom"'::regclass, ARRAY['id'], 'SET NULL', 'CASCADE');
    END IF;

    IF to_regclass('public."Distributor"') IS NOT NULL
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'qr_codes' AND column_name = 'assignedDistributorId') THEN
      PERFORM pg_temp.add_fk_if_missing('public."qr_codes"'::regclass, 'qr_codes_assignedDistributorId_fkey', ARRAY['assignedDistributorId'], 'public."Distributor"'::regclass, ARRAY['id'], 'SET NULL', 'CASCADE');
    END IF;
  END IF;
END $$;

-- Final duplicate cleanup after adding expected qr_codes foreign keys.
DO $$
DECLARE
  duplicate_constraint record;
BEGIN
  IF to_regclass('public."qr_codes"') IS NOT NULL THEN
    FOR duplicate_constraint IN
      WITH ranked AS (
        SELECT
          c.oid,
          c.conname,
          row_number() OVER (
            PARTITION BY c.conrelid, c.conkey, c.confrelid, c.confkey
            ORDER BY
              CASE
                WHEN c.conname IN (
                  'qr_codes_publisherId_fkey',
                  'qr_codes_venueId_fkey',
                  'qr_codes_restroomId_fkey',
                  'qr_codes_assignedDistributorId_fkey'
                ) THEN 0
                ELSE 1
              END,
              c.oid
          ) AS keep_rank
        FROM pg_constraint c
        WHERE c.contype = 'f'
          AND c.conrelid = 'public."qr_codes"'::regclass
      )
      SELECT conname FROM ranked WHERE keep_rank > 1
    LOOP
      EXECUTE format('ALTER TABLE "qr_codes" DROP CONSTRAINT IF EXISTS %I', duplicate_constraint.conname);
    END LOOP;
  END IF;
END $$;

COMMIT;
