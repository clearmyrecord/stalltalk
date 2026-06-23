import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { getDefaultIssue } from "@/lib/default-issue";
import { prisma } from "@/lib/prisma";
import { DefaultIssueEditor } from "./DefaultIssueEditor";
import { getDefaultIssueDiagnostics, type DefaultIssueDiagnostics } from "@/lib/default-issue-diagnostics";

type PageState = {
  issue: any | null;
  ads: any[];
  diagnostics: DefaultIssueDiagnostics;
  error: string | null;
};

function normalizeError(error: unknown) {
  return error instanceof Error ? error.message : String(error || "Unknown default issue load error");
}

function extractMissingSchema(error: string | null) {
  if (!error) return null;
  const match = error.match(/(?:column|table|relation)\s+\"?([A-Za-z0-9_\.]+)\"?/i);
  return match?.[1] || null;
}

async function loadDefaultIssuePageState(): Promise<PageState> {
  let issue = null;
  let ads: any[] = [];
  let error: string | null = null;

  try {
    issue = await getDefaultIssue({ createIfMissing: true });
  } catch (caught) {
    error = normalizeError(caught);
  }

  try {
    ads = await prisma.ad.findMany({ where: { status: "ACTIVE" }, orderBy: [{ businessName: "asc" }] });
  } catch (caught) {
    error = [error, normalizeError(caught)].filter(Boolean).join(" | ");
  }

  const diagnostics = await getDefaultIssueDiagnostics(error);
  return { issue, ads, diagnostics, error };
}

function ErrorPanel({ error }: { error: string }) {
  const missingSchema = extractMissingSchema(error);
  return <div className="grid gap-3 rounded-2xl border-4 border-red-800 bg-red-100 p-5 text-red-950 shadow-brutal">
    <h2 className="font-display text-5xl uppercase">Default Issue Load Error</h2>
    <p className="font-black">The page did not render blank. The editor could not load because the database/schema check failed.</p>
    <pre className="whitespace-pre-wrap rounded-xl border-2 border-red-800 bg-white p-3 font-mono text-sm">{error}</pre>
    {missingSchema ? <p className="font-black">Missing table/column detected: <code>{missingSchema}</code></p> : <p className="font-black">Missing table/column: not detected from the error text.</p>}
    <p className="font-black">Run database migration: deploy <code>prisma/migrations/20260622000000_default_issue_neon/migration.sql</code> against Neon, then redeploy/regenerate Prisma if needed.</p>
    <Link href="/admin/ad-studio" className="w-fit rounded bg-ink px-4 py-3 font-black uppercase text-white">Back to Ad Studio</Link>
  </div>;
}

function DiagnosticsPanel({ diagnostics }: { diagnostics: DefaultIssueDiagnostics }) {
  const tableCount = Object.values(diagnostics.requiredTables).filter(Boolean).length;
  const columnCount = Object.values(diagnostics.requiredColumns).filter(Boolean).length;
  return <section className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal">
    <h2 className="font-display text-4xl uppercase">Default Issue Diagnostics</h2>
    <div className="grid gap-2 font-black md:grid-cols-3">
      <p>Data source: {diagnostics.dataSource}</p>
      <p>DB connected: {diagnostics.databaseConnected ? "true" : "false"}</p>
      <p>Default issue ID: {diagnostics.defaultIssueId || "not found"}</p>
      <p>Content block count: {diagnostics.contentBlockCount}</p>
      <p>Sponsor slot count: {diagnostics.sponsorSlotCount}</p>
      <p>Required tables: {tableCount}/{Object.keys(diagnostics.requiredTables).length}</p>
      <p>Required columns: {columnCount}/{Object.keys(diagnostics.requiredColumns).length}</p>
    </div>
    {diagnostics.detectedError ? <p className="mt-3 rounded-xl border-2 border-red-800 bg-red-100 p-3 font-black text-red-950">Detected error: {diagnostics.detectedError}</p> : null}
  </section>;
}

export default async function DefaultIssuePage() {
  const { issue, ads, diagnostics, error } = await loadDefaultIssuePageState();
  return <section className="grid gap-5">
    {error ? <AdminNav /> : null}
    <div><h1 className="font-display text-7xl uppercase">Default Global Issue</h1><p className="font-bold">Edit the same default global issue rendered at /issue when no venue, QR, or issue parameter is provided. Schedule ISO is intentionally hidden.</p></div>
    <DiagnosticsPanel diagnostics={diagnostics} />
    {issue?.fallbackMessage ? <p className="rounded-2xl border-4 border-stallRed bg-white p-5 font-black text-stallRed">{issue.fallbackMessage}</p> : null}
    {error ? <ErrorPanel error={error} /> : issue ? <DefaultIssueEditor issue={JSON.parse(JSON.stringify(issue))} ads={JSON.parse(JSON.stringify(ads))} /> : <p className="rounded-2xl border-4 border-ink bg-white p-5 font-black">Create editable default issue from current content failed because no publisher exists. Run database migration if schema diagnostics above show missing columns.</p>}
  </section>;
}
