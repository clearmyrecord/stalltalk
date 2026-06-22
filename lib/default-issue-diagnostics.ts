import { prisma } from "@/lib/prisma";
import { DEFAULT_GLOBAL_ISSUE_NUMBER } from "@/lib/default-global-issue";

const REQUIRED_TABLES = ["Issue", "IssueContentBlock", "IssueAdSlot", "Ad", "StalltalkCampaignHistory"] as const;
const REQUIRED_COLUMNS = [
  ["Issue", "slug"], ["Issue", "isDefault"],
  ["IssueContentBlock", "layoutKey"], ["IssueContentBlock", "data"], ["IssueContentBlock", "sortOrder"],
  ["IssueAdSlot", "placement"], ["IssueAdSlot", "adId"],
  ["Ad", "creativeBrief"], ["StalltalkCampaignHistory", "creativeBrief"], ["AdCampaign", "creativeBrief"],
] as const;

export type DefaultIssueDiagnostics = {
  dataSource: "Neon";
  databaseConnected: boolean;
  requiredTables: Record<string, boolean>;
  requiredColumns: Record<string, boolean>;
  defaultIssueExists: boolean;
  defaultIssueId: string | null;
  contentBlockCount: number;
  sponsorSlotCount: number;
  detectedError: string | null;
};

function key(table: string, column: string) {
  return `${table}.${column}`;
}

export async function getDefaultIssueDiagnostics(initialError?: string | null): Promise<DefaultIssueDiagnostics> {
  const diagnostics: DefaultIssueDiagnostics = {
    dataSource: "Neon",
    databaseConnected: false,
    requiredTables: Object.fromEntries(REQUIRED_TABLES.map((table) => [table, false])),
    requiredColumns: Object.fromEntries(REQUIRED_COLUMNS.map(([table, column]) => [key(table, column), false])),
    defaultIssueExists: false,
    defaultIssueId: null,
    contentBlockCount: 0,
    sponsorSlotCount: 0,
    detectedError: initialError || null,
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    diagnostics.databaseConnected = true;

    const tableRows = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('Issue', 'IssueContentBlock', 'IssueAdSlot', 'Ad', 'StalltalkCampaignHistory')
    `;
    for (const row of tableRows) diagnostics.requiredTables[row.table_name] = true;

    const columnRows = await prisma.$queryRaw<Array<{ table_name: string; column_name: string }>>`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (table_name, column_name) IN (
          ('Issue', 'slug'), ('Issue', 'isDefault'),
          ('IssueContentBlock', 'layoutKey'), ('IssueContentBlock', 'data'), ('IssueContentBlock', 'sortOrder'),
          ('IssueAdSlot', 'placement'), ('IssueAdSlot', 'adId'),
          ('Ad', 'creativeBrief'), ('StalltalkCampaignHistory', 'creativeBrief'), ('AdCampaign', 'creativeBrief')
        )
    `;
    for (const row of columnRows) diagnostics.requiredColumns[key(row.table_name, row.column_name)] = true;

    if (diagnostics.requiredTables.Issue) {
      const rows = await prisma.$queryRaw<Array<{ id: string; block_count: bigint; slot_count: bigint }>>`
        SELECT i.id,
          (SELECT COUNT(*) FROM "IssueContentBlock" b WHERE b."issueId" = i.id) AS block_count,
          (SELECT COUNT(*) FROM "IssueAdSlot" s WHERE s."issueId" = i.id) AS slot_count
        FROM "Issue" i
        WHERE i."venueId" IS NULL AND i."qrCodeId" IS NULL AND i."restroomId" IS NULL AND i."issueNumber" = ${DEFAULT_GLOBAL_ISSUE_NUMBER}
        LIMIT 1
      `;
      const row = rows[0];
      diagnostics.defaultIssueExists = Boolean(row);
      diagnostics.defaultIssueId = row?.id || null;
      diagnostics.contentBlockCount = Number(row?.block_count || 0);
      diagnostics.sponsorSlotCount = Number(row?.slot_count || 0);
    }
  } catch (caught) {
    diagnostics.detectedError = caught instanceof Error ? caught.message : String(caught || "Unknown diagnostics error");
  }
  return diagnostics;
}
