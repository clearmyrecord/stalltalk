import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const requiredTables = [
  "User", "AuthSession", "Publisher", "Distributor", "Advertiser", "Venue", "Restroom",
  "qr_codes", "Issue", "AnalyticsEvent", "AdCampaign", "AdSlotInventory", "ToiletLocation",
  "AdCampaignPlacement", "AdCreative", "AdvertiserInvoice", "Payment", "VenueContentDraft",
  "VenueMediaAsset", "restaurant_reviews", "qr_scans", "qr_lifecycle_events", "PublishedContent"
];

const requiredEnums = {
  Role: ["SUPER_ADMIN", "ADMIN", "VENUE_MANAGER", "ADVERTISER", "DISTRIBUTOR", "VENUE"],
  AccountStatus: ["ACTIVE", "INACTIVE", "SUSPENDED"],
  QrCodeStatus: ["DRAFT", "PRINTED", "DEPLOYED", "ACTIVE", "RETIRED"],
  QrCodeType: ["VENUE", "RESTROOM", "CAMPAIGN", "TEST"],
  QrStickerTemplate: ["STALL_DOOR", "URINAL_WALL", "TABLE_TENT", "WINDOW_STICKER"],
  QrLifecycleAction: ["CREATE", "PRINT", "DEPLOY", "REPLACE", "RETIRE"]
};

try {
  const tables = await prisma.$queryRaw`
    SELECT table_name AS name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;
  const tableSet = new Set(tables.map((row) => row.name));

  const enumRows = await prisma.$queryRaw`
    SELECT t.typname AS name, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    GROUP BY t.typname
    ORDER BY t.typname;
  `;
  const enumMap = new Map(enumRows.map((row) => [row.name, row.values]));

  let ok = true;
  console.log("Database schema diagnostics");
  console.log("===========================");
  for (const table of requiredTables) {
    const exists = tableSet.has(table);
    ok &&= exists;
    console.log(`${exists ? "✓" : "✗"} table ${table}`);
  }
  for (const [name, values] of Object.entries(requiredEnums)) {
    const actual = enumMap.get(name) ?? [];
    const missing = values.filter((value) => !actual.includes(value));
    ok &&= missing.length === 0;
    console.log(`${missing.length === 0 ? "✓" : "✗"} enum ${name}${missing.length ? ` (missing: ${missing.join(", ")})` : ""}`);
  }

  process.exitCode = ok ? 0 : 1;
} finally {
  await prisma.$disconnect();
}
