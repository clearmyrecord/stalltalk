#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const databaseUrl = process.env.REPAIR_MIGRATION_TEST_DATABASE_URL;
if (!databaseUrl) {
  console.error("Set REPAIR_MIGRATION_TEST_DATABASE_URL to an empty disposable PostgreSQL database.");
  process.exit(2);
}

const psql = process.env.PSQL_BIN || "psql";
const migrationPath = resolve("prisma/migrations/20260718160000_repair_permanent_qr_schema/migration.sql");
const migrationSql = readFileSync(migrationPath, "utf8");

function runSql(sql) {
  return execFileSync(psql, [databaseUrl, "--set", "ON_ERROR_STOP=1", "--tuples-only", "--no-align", "--command", sql], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function execSql(sql) {
  execFileSync(psql, [databaseUrl, "--set", "ON_ERROR_STOP=1"], {
    input: sql,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
}

const baselineSql = String.raw`
CREATE EXTENSION IF NOT EXISTS pgcrypto;
DO $$ BEGIN CREATE TYPE "ContentBlockType" AS ENUM ('ARTICLE', 'QUOTE', 'FACT', 'JOKE', 'CALENDAR', 'EVENT', 'COUPON', 'ADVERTISEMENT', 'RESTAURANT_REVIEW', 'ANNOUNCEMENT', 'SPONSOR_SLOT', 'MISSION', 'HILARIOUSLY_FUNNY', 'FEATURE_ARTICLE', 'EVENT_CALENDAR', 'LOCAL_DEALS', 'TRIVIA', 'INSPIRATIONAL_QUOTES', 'WORD_OF_THE_MONTH'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "IssueStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE TABLE IF NOT EXISTS "Venue" ("id" TEXT PRIMARY KEY, "publisherId" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL UNIQUE, "city" TEXT NOT NULL, "state" TEXT NOT NULL, "address" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS "Restroom" ("id" TEXT PRIMARY KEY, "venueId" TEXT NOT NULL REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE, "name" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS "qr_codes" ("id" TEXT PRIMARY KEY, "uuid" TEXT NOT NULL DEFAULT gen_random_uuid()::text, "venueId" TEXT REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE, "restroomId" TEXT REFERENCES "Restroom"("id") ON DELETE SET NULL ON UPDATE CASCADE, "qr_name" TEXT NOT NULL, "qr_slug" TEXT NOT NULL UNIQUE, "qr_url" TEXT NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS "Issue" ("id" TEXT PRIMARY KEY, "venueId" TEXT, "restroomId" TEXT, "qrCodeId" TEXT, "title" TEXT NOT NULL, "month" TEXT NOT NULL, "year" INTEGER NOT NULL, "issueNumber" INTEGER NOT NULL, "status" "IssueStatus" NOT NULL DEFAULT 'DRAFT', "isPublished" BOOLEAN NOT NULL DEFAULT false, "isArchived" BOOLEAN NOT NULL DEFAULT false, "publishedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS "IssueContentBlock" ("id" TEXT PRIMARY KEY, "issueId" TEXT NOT NULL REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE, "type" "ContentBlockType" NOT NULL, "title" TEXT NOT NULL, "body" TEXT NOT NULL, "sortOrder" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
INSERT INTO "Venue" ("id", "publisherId", "name", "slug", "city", "state", "address") VALUES ('venue_1', 'publisher_1', 'Venue One', 'venue-one', 'Las Vegas', 'NV', '1 Main') ON CONFLICT DO NOTHING;
INSERT INTO "Restroom" ("id", "venueId", "name") VALUES ('restroom_1', 'venue_1', 'Restroom One') ON CONFLICT DO NOTHING;
INSERT INTO "qr_codes" ("id", "venueId", "restroomId", "qr_name", "qr_slug", "qr_url") VALUES ('qr_1', 'venue_1', 'restroom_1', 'QR One', 'qr-one', '/q/qr-one') ON CONFLICT DO NOTHING;
INSERT INTO "Issue" ("id", "venueId", "restroomId", "qrCodeId", "title", "month", "year", "issueNumber", "status", "isPublished", "isArchived", "publishedAt") VALUES ('issue_venue', 'venue_1', NULL, NULL, 'Venue Issue', 'July', 2026, 1, 'PUBLISHED', true, false, CURRENT_TIMESTAMP), ('issue_restroom', 'venue_1', 'restroom_1', NULL, 'Restroom Issue', 'July', 2026, 2, 'PUBLISHED', true, false, CURRENT_TIMESTAMP), ('issue_qr', 'venue_1', 'restroom_1', 'qr_1', 'QR Issue', 'July', 2026, 3, 'PUBLISHED', true, false, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING;
INSERT INTO "IssueContentBlock" ("id", "issueId", "type", "title", "body", "sortOrder") VALUES ('block_1', 'issue_venue', 'ARTICLE', 'Headline Source', 'Body', 1) ON CONFLICT DO NOTHING;
`;

execSql(baselineSql);
execSql(migrationSql);
execSql(migrationSql);

const checks = [
  ["IssueTargetType enum", "SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IssueTargetType')"],
  ["QrPlacementType enum", "SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QrPlacementType')"],
  ["IssueTarget table", "SELECT to_regclass('public.\"IssueTarget\"') IS NOT NULL"],
  ["Venue.publicToken", "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Venue' AND column_name='publicToken')"],
  ["Venue.timeZone", "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Venue' AND column_name='timeZone' AND column_default LIKE '%America/Los_Angeles%')"],
  ["QR placement fields", "SELECT COUNT(*) = 4 FROM information_schema.columns WHERE table_schema='public' AND table_name='qr_codes' AND column_name IN ('public_token', 'internal_label', 'placement_type', 'is_active')"],
  ["IssueTarget scheduling fields", "SELECT COUNT(*) = 6 FROM information_schema.columns WHERE table_schema='public' AND table_name='IssueTarget' AND column_name IN ('publishAt', 'unpublishAt', 'canceledAt', 'publishedAt', 'createdAt', 'updatedAt')"],
  ["IssueContentBlock fields", "SELECT COUNT(*) = 3 FROM information_schema.columns WHERE table_schema='public' AND table_name='IssueContentBlock' AND column_name IN ('headline', 'sectionType', 'isVisible')"],
  ["IssueTarget backfill without duplicates", "SELECT COUNT(*) = COUNT(DISTINCT \"id\") AND COUNT(*) = 4 AND COUNT(*) FILTER (WHERE \"targetType\" = 'VENUE') = 1 AND COUNT(*) FILTER (WHERE \"targetType\" = 'RESTROOM') = 2 AND COUNT(*) FILTER (WHERE \"targetType\" = 'QR_PLACEMENT') = 1 FROM \"IssueTarget\""]
];

for (const [name, sql] of checks) {
  if (runSql(sql) !== "t") {
    console.error(`Repair migration verification failed: ${name}`);
    process.exit(1);
  }
}

console.log("Repair migration verification passed.");
