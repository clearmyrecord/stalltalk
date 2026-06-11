import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = globalThis.__pottyFavorPublishPrisma || new PrismaClient();
globalThis.__pottyFavorPublishPrisma = prisma;

const FALLBACK_FILE = process.env.PUBLISHED_CONTENT_FILE || path.join(os.tmpdir(), "pottyfavor-published-content.json");

function hasDatabaseUrl() {
  return Boolean(String(process.env.DATABASE_URL || "").trim());
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
  const normalized = sanitizePublishedContent(payload);

  if (hasDatabaseUrl()) {
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

  await fs.mkdir(path.dirname(FALLBACK_FILE), { recursive: true });
  await fs.writeFile(FALLBACK_FILE, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return publicPayload(normalized);
}

export async function getLatestPublishedContent() {
  if (hasDatabaseUrl()) {
    await ensureTable();
    const rows = await prisma.$queryRawUnsafe(`SELECT "issue", "ads", "events", "venues", "settings", "publishedAt" FROM "PublishedContent" ORDER BY "publishedAt" DESC, "createdAt" DESC LIMIT 1`);
    if (!Array.isArray(rows) || !rows[0]) return null;
    const row = rows[0];
    return publicPayload({
      ...row,
      publishedAt: row.publishedAt instanceof Date ? row.publishedAt.toISOString() : row.publishedAt,
    });
  }

  try {
    const raw = await fs.readFile(FALLBACK_FILE, "utf8");
    return publicPayload(JSON.parse(raw));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}
