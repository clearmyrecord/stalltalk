import { prisma } from "@/lib/prisma";

const REQUIRED_TABLES = ["DefaultIssue", "Ad"] as const;
const REQUIRED_COLUMNS = [
  ["DefaultIssue", "id"], ["DefaultIssue", "title"], ["DefaultIssue", "slug"], ["DefaultIssue", "issueJson"], ["DefaultIssue", "createdAt"], ["DefaultIssue", "updatedAt"],
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
        AND table_name IN ('DefaultIssue', 'Ad')
    `;
    for (const row of tableRows) diagnostics.requiredTables[row.table_name] = true;

    const columnRows = await prisma.$queryRaw<Array<{ table_name: string; column_name: string }>>`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (table_name, column_name) IN (
          ('DefaultIssue', 'id'), ('DefaultIssue', 'title'), ('DefaultIssue', 'slug'), ('DefaultIssue', 'issueJson'), ('DefaultIssue', 'createdAt'), ('DefaultIssue', 'updatedAt')
        )
    `;
    for (const row of columnRows) diagnostics.requiredColumns[key(row.table_name, row.column_name)] = true;

    if (diagnostics.requiredTables.DefaultIssue) {
      const rows = await prisma.$queryRaw<Array<{ id: string; block_count: number; slot_count: number }>>`
        SELECT "id",
          COALESCE(jsonb_array_length("issueJson"->'contentBlocks'), 0) AS block_count,
          COALESCE(jsonb_array_length("issueJson"->'adSlots'), 0) AS slot_count
        FROM "DefaultIssue"
        ORDER BY "updatedAt" DESC
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
