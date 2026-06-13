import { ensureBootstrapAdmin } from "@/lib/bootstrap-admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Diagnostic = { label: string; value: string | number; detail?: string; tone?: "ok" | "warn" | "fail" };

function databaseUrlDiagnostic() {
  const databaseUrl = process.env.DATABASE_URL || "";
  let database = "Not configured";
  let host = "Not configured";
  try {
    if (databaseUrl) {
      const parsed = new URL(databaseUrl);
      database = parsed.pathname.replace(/^\//, "") || "unknown";
      host = parsed.host;
    }
  } catch {
    database = "Invalid DATABASE_URL";
    host = "Invalid DATABASE_URL";
  }
  return { databaseUrlDetected: Boolean(databaseUrl), database, host, intended: "stalltalk" };
}

async function collectDiagnostics() {
  const bootstrap = await ensureBootstrapAdmin();
  const [userCount, issueCount, advertiserCount, venueCount, qrCount, adminCount] = await Promise.all([
    prisma.user.count(),
    prisma.issue.count(),
    prisma.advertiser.count(),
    prisma.venue.count(),
    prisma.qrCode.count(),
    prisma.user.count({ where: { role: { in: ["SUPER_ADMIN", "ADMIN"] as any } } })
  ]);
  const databaseUrl = databaseUrlDiagnostic();
  return { bootstrap, counts: { userCount, issueCount, advertiserCount, venueCount, qrCount, adminCount }, databaseUrl };
}

export default async function StartupDiagnosticsPage() {
  const diagnostics = await collectDiagnostics();
  const cards: Diagnostic[] = [
    { label: "Users", value: diagnostics.counts.userCount, detail: diagnostics.counts.userCount > 0 ? "User table contains records." : "No users found.", tone: diagnostics.counts.userCount > 0 ? "ok" : "fail" },
    { label: "Admins", value: diagnostics.counts.adminCount, detail: diagnostics.counts.adminCount > 0 ? "Admin access is available." : "No admin exists.", tone: diagnostics.counts.adminCount > 0 ? "ok" : "fail" },
    { label: "Issues", value: diagnostics.counts.issueCount },
    { label: "Advertisers", value: diagnostics.counts.advertiserCount },
    { label: "Venues", value: diagnostics.counts.venueCount },
    { label: "QR Codes", value: diagnostics.counts.qrCount },
    { label: "Bootstrap Admin", value: diagnostics.bootstrap.created ? "Created" : "Checked", detail: diagnostics.bootstrap.error || `Email: ${diagnostics.bootstrap.email}. Emergency password hash valid: ${diagnostics.bootstrap.passwordHashValid ? "yes" : "not applicable"}.`, tone: diagnostics.bootstrap.error ? "fail" : "ok" },
    { label: "DATABASE_URL", value: diagnostics.databaseUrl.databaseUrlDetected ? diagnostics.databaseUrl.database : "Missing", detail: `Host: ${diagnostics.databaseUrl.host}. Intended database: ${diagnostics.databaseUrl.intended}.`, tone: diagnostics.databaseUrl.database === diagnostics.databaseUrl.intended ? "ok" : "warn" }
  ];

  return <section>
    <p className="font-black uppercase tracking-[.25em] text-stallRed">Startup Diagnostics</p>
    <h1 className="font-display text-7xl uppercase">Authentication & Seed Data</h1>
    <p className="mt-3 max-w-3xl font-bold">Use this page after setup or deployment to confirm seed data, admin access, password hashing, and the active database target.</p>
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => <DiagnosticCard key={card.label} {...card} />)}
    </div>
  </section>;
}

function DiagnosticCard({ label, value, detail, tone = "ok" }: Diagnostic) {
  const color = tone === "fail" ? "text-stallRed" : tone === "warn" ? "text-stallPurple" : "text-ink";
  return <article className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal">
    <p className="font-black uppercase text-stallRed">{label}</p>
    <h2 className={`break-words font-display text-5xl uppercase ${color}`}>{value}</h2>
    {detail ? <p className="mt-2 break-words font-bold">{detail}</p> : null}
  </article>;
}
