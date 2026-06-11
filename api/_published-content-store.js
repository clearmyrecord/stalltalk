import { PrismaClient } from "@prisma/client";

const prisma = globalThis.__pottyFavorPublishPrisma || new PrismaClient();
globalThis.__pottyFavorPublishPrisma = prisma;

export function isPublishDatabaseConfigured() {
  return Boolean(String(process.env.DATABASE_URL || "").trim());
}

export function publishStoreSetupMessage() {
  return "Live publishing requires DATABASE_URL/Postgres or another durable store. Configure DATABASE_URL before using Publish Live.";
}

export class PublishStoreSetupError extends Error {
  constructor(message = publishStoreSetupMessage()) {
    super(message);
    this.name = "PublishStoreSetupError";
    this.statusCode = 503;
    this.code = "PUBLISH_STORE_NOT_CONFIGURED";
  }
}

function assertPublishDatabaseConfigured() {
  if (!isPublishDatabaseConfigured()) throw new PublishStoreSetupError();
}

function serialize(value) {
  return value === undefined ? null : value;
}

export function publicPayload(record) {
  if (!record || typeof record !== "object") return null;
  return {
    issue: record.issue || null,
    ads: Array.isArray(record.ads) ? record.ads : [],
    events: Array.isArray(record.events) ? record.events : [],
    venues: Array.isArray(record.venues) ? record.venues : [],
    settings: record.settings && typeof record.settings === "object" ? record.settings : {},
    publishedAt: record.publishedAt || null,
  };
}

export function sanitizePublishedContent(input = {}) {
  const settings = input.settings && typeof input.settings === "object" ? { ...input.settings } : {};
  delete settings.adminPublishToken;
  delete settings.publishToken;
  delete settings.ADMIN_PUBLISH_TOKEN;

  return {
    issue: input.issue && typeof input.issue === "object" ? input.issue : {},
    ads: Array.isArray(input.ads) ? input.ads : [],
    events: Array.isArray(input.events) ? input.events : [],
    venues: Array.isArray(input.venues) ? input.venues : [],
    settings,
    publishedAt: input.publishedAt || new Date().toISOString(),
    publishedBy: input.publishedBy && typeof input.publishedBy === "object" ? input.publishedBy : null,
  };
}

async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PublishedContent" (
      "id" TEXT PRIMARY KEY,
      "issue" JSONB NOT NULL,
      "ads" JSONB NOT NULL,
      "events" JSONB NOT NULL,
      "venues" JSONB NOT NULL,
      "settings" JSONB NOT NULL,
      "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "publishedBy" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PublishedContent_publishedAt_idx" ON "PublishedContent" ("publishedAt" DESC)`);
}

export async function savePublishedContent(payload) {
  assertPublishDatabaseConfigured();
  const normalized = sanitizePublishedContent(payload);

  await ensureTable();
  const id = `pub_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  await prisma.$executeRawUnsafe(
    `INSERT INTO "PublishedContent" ("id", "issue", "ads", "events", "venues", "settings", "publishedAt", "publishedBy") VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb, $7::timestamp, $8::jsonb)`,
    id,
    JSON.stringify(normalized.issue),
    JSON.stringify(normalized.ads),
    JSON.stringify(normalized.events),
    JSON.stringify(normalized.venues),
    JSON.stringify(normalized.settings),
    normalized.publishedAt,
    JSON.stringify(serialize(normalized.publishedBy))
  );
  return publicPayload(normalized);
}

export async function getLatestPublishedContent() {
  assertPublishDatabaseConfigured();
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe(`SELECT "issue", "ads", "events", "venues", "settings", "publishedAt" FROM "PublishedContent" ORDER BY "publishedAt" DESC, "createdAt" DESC LIMIT 1`);
  if (!Array.isArray(rows) || !rows[0]) return null;
  const row = rows[0];
  return publicPayload({
    ...row,
    publishedAt: row.publishedAt instanceof Date ? row.publishedAt.toISOString() : row.publishedAt,
  });
}
