import Link from "next/link";
import { redirect } from "next/navigation";
import { approveAdCampaign, approveVenueContentDraft, publishVenueContentDraft, rejectAdCampaign, rejectVenueContentDraft } from "@/lib/actions";
import { authEnvStatus, currentUser } from "@/lib/auth";
import { money } from "@/lib/format";
import { flightStatus } from "@/lib/campaign-flights";
import { prisma } from "@/lib/prisma";
import { restroomBaseSelect, restroomLabelSelect } from "@/lib/restroom-schema";

type DashboardCounts = {
  publishers: number;
  distributors: number;
  advertisers: number;
  venues: number;
  qrCodes: number;
  issues: number;
};

const requiredDashboardTables = ["User", "AuthSession", "qr_codes", "qr_scans", "qr_lifecycle_events"] as const;

export const dynamic = "force-dynamic";

const adminLinks = [
  ["Content editor", "/admin/articles"],
  ["Restaurant review editor", "/admin/issues"],
  ["Schedule Next Month", "/admin/schedule"],
  ["Venue management", "/admin/venues"],
  ["QR/toilet location management", "/admin/qr"],
  ["Sponsor placement inventory", "/admin/venues"],
  ["Advertiser campaigns", "/admin/ads"],
  ["Payments", "/admin/stripe"],
  ["Venue content drafts", "#venue-drafts"],
  ["Publish Live status", "/admin/deployment-checklist"]
];

function statusClass(status: string) {
  if (["APPROVED", "PAID", "ACTIVE", "SUCCEEDED", "OPEN"].includes(status)) return "bg-green-100";
  if (["REJECTED", "FAILED", "EXPIRED"].includes(status)) return "bg-stallRed text-white";
  return "bg-stallYellow";
}

export default async function AdminDashboardPage() {
  const auth = authEnvStatus();
  const user = await currentUser();
  if (auth.isConfigured && (!user || user.role !== "ADMIN")) redirect("/signin?error=role");

  const [healthRows, dashboardCounts] = await Promise.all([
    prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name IN ('User', 'AuthSession', 'qr_codes', 'qr_scans', 'qr_lifecycle_events')
    `,
    getDashboardCounts()
  ]);
  const existingHealthTables = new Set(healthRows.map((row) => row.table_name));
  const isSystemHealthy = requiredDashboardTables.every((table) => existingHealthTables.has(table));

  try {
    const [venues, qrCodes, inventory, campaigns, payments, drafts, published] = await Promise.all([
      prisma.venue.findMany({ include: { restrooms: { select: restroomBaseSelect }, qrCodes: true }, orderBy: { name: "asc" } }),
      prisma.qrCode.findMany({ include: { venue: true, restroom: { select: restroomLabelSelect }, toiletLocations: true }, orderBy: { qrSlug: "asc" } }),
      prisma.adSlotInventory.findMany({ include: { venue: true, restroom: { select: restroomLabelSelect }, qrCode: true, toiletLocation: true }, orderBy: [{ month: "asc" }, { slotNumber: "asc" }] }),
      prisma.adCampaign.findMany({ include: { advertiser: true, inventory: { include: { venue: true, restroom: { select: restroomLabelSelect }, qrCode: true } }, placements: { include: { inventory: { include: { venue: true, restroom: { select: restroomLabelSelect }, qrCode: true, toiletLocation: true } } } }, payments: true }, orderBy: { createdAt: "desc" } }),
      prisma.payment.findMany({ include: { advertiser: true, campaign: true }, orderBy: { createdAt: "desc" } }),
      prisma.venueContentDraft.findMany({ include: { venue: true }, orderBy: { createdAt: "desc" } }),
      prisma.publishedContent.findFirst({ orderBy: { publishedAt: "desc" } })
    ]);

    const paidRevenue = payments.filter((payment) => payment.status === "SUCCEEDED").reduce((sum, payment) => sum + payment.amountCents, 0);
    const pipelineRevenue = campaigns.filter((campaign) => ["PAYMENT_PENDING", "PAID", "APPROVED", "ACTIVE"].includes(campaign.status)).reduce((sum, campaign) => sum + (campaign.totalAmountCents || campaign.priceCents), 0);
    const activeCampaigns = campaigns.filter((campaign) => campaign.status === "ACTIVE" || (campaign.status === "PAID" && campaign.approvalStatus === "APPROVED"));
    const expiredCampaigns = campaigns.filter((campaign) => campaign.status === "EXPIRED" || (campaign.endsAt && campaign.endsAt < new Date()));

    return <section className="grid gap-6"><div><p className="font-black uppercase tracking-[.25em] text-stallRed">Role-protected admin</p><h1 className="font-display text-7xl uppercase">Admin Dashboard</h1><p className="max-w-4xl font-bold">Manage venues, QR/toilet locations, paid ad inventory, campaign approvals, payments, venue drafts, and Publish Live readiness from one mobile-friendly control center.</p>{!auth.isConfigured ? <Setup /> : null}</div><HealthBanner healthy={isSystemHealthy} /><div className="grid gap-3 md:grid-cols-3">{adminLinks.map(([label, href]) => <Link key={label} href={href} className="rounded-2xl border-4 border-ink bg-white p-4 font-black uppercase shadow-brutal">{label}</Link>)}</div><LiveCounts counts={dashboardCounts} /><div className="grid gap-3 md:grid-cols-4">{[["Paid revenue", money(paidRevenue)], ["Monthly revenue estimate", money(pipelineRevenue)], ["Active campaigns", activeCampaigns.length], ["Expired campaigns", expiredCampaigns.length]].map(([label, value]) => <div key={label} className="rounded-2xl border-4 border-ink bg-stallYellow p-4 shadow-brutal"><p className="font-black uppercase text-stallRed">{label}</p><p className="font-display text-4xl">{value}</p></div>)}</div><section className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal"><h2 className="font-display text-5xl uppercase">Publish Live status</h2><p className="font-bold">Last publish: {published ? published.publishedAt.toLocaleString() : "No published snapshot yet"}. Public pages keep fallbacks when venue-specific content or paid ads are unavailable.</p></section><Table title="All venues" empty="No venues have been created yet." rows={venues.map((venue) => [venue.name, `${venue.city}, ${venue.state}`, `${venue.restrooms.length} restroom(s)`, `${venue.qrCodes.length} QR code(s)`])} /><Table title="All QR/toilet locations" empty="No QR or toilet locations yet." rows={qrCodes.map((qr) => [qr.qrSlug, qr.venue?.name || "Unassigned", qr.restroom?.name || "Venue-wide", `${qr.toiletLocations.length} toilet location(s)`])} /><Table title="All ad inventory" empty="No ad inventory has been created yet." rows={inventory.map((slot) => [slot.venue.name, slot.month, `Sponsor Placement ${slot.slotNumber}`, slot.restroom?.name || slot.qrCode?.qrSlug || "Venue-wide", money(slot.priceCents), slot.status])} /><CampaignApprovals campaigns={campaigns} /><Payments payments={payments} /><VenueDrafts drafts={drafts} /></section>;
  } catch {
    return <section className="grid gap-6"><div><p className="font-black uppercase tracking-[.25em] text-stallRed">Role-protected admin</p><h1 className="font-display text-7xl uppercase">Admin Dashboard</h1><p className="max-w-4xl font-bold">Manage venues, QR/toilet locations, paid ad inventory, campaign approvals, payments, venue drafts, and Publish Live readiness from one mobile-friendly control center.</p>{!auth.isConfigured ? <Setup /> : null}</div><HealthBanner healthy={isSystemHealthy} /><div className="grid gap-3 md:grid-cols-3">{adminLinks.map(([label, href]) => <Link key={label} href={href} className="rounded-2xl border-4 border-ink bg-white p-4 font-black uppercase shadow-brutal">{label}</Link>)}</div><LiveCounts counts={dashboardCounts} /></section>;
  }

}

async function getDashboardCounts(): Promise<DashboardCounts> {
  const [publishers, distributors, advertisers, venues, qrCodes, issues] = await Promise.all([
    prisma.publisher.count(),
    prisma.distributor.count(),
    prisma.advertiser.count(),
    prisma.venue.count(),
    prisma.qrCode.count(),
    prisma.issue.count()
  ]);

  return { publishers, distributors, advertisers, venues, qrCodes, issues };
}

function HealthBanner({ healthy }: { healthy: boolean }) { return <p className={`rounded-2xl border-4 border-ink p-5 font-black uppercase shadow-brutal ${healthy ? "bg-green-100" : "bg-stallYellow"}`}>{healthy ? "System Healthy - Database Connected" : "Database connected - required dashboard tables are still being verified"}</p>; }
function LiveCounts({ counts }: { counts: DashboardCounts }) { return <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">{[["Publishers", counts.publishers], ["Distributors", counts.distributors], ["Advertisers", counts.advertisers], ["Venues", counts.venues], ["QR Codes", counts.qrCodes], ["Issues", counts.issues]].map(([label, value]) => <div key={label} className="rounded-2xl border-4 border-ink bg-stallYellow p-4 shadow-brutal"><p className="font-black uppercase text-stallRed">{label}</p><p className="font-display text-4xl">{value}</p></div>)}</div>; }

function Setup({ message = "Set AUTH_SECRET and DATABASE_URL to protect dashboards with role-based sessions." }: { message?: string }) { return <p className="mt-4 rounded-2xl border-4 border-ink bg-stallYellow p-5 font-black shadow-brutal">{message}</p>; }
function Badge({ status }: { status: string }) { return <span className={`rounded-full border-2 border-ink px-2 py-1 text-xs font-black uppercase ${statusClass(status)}`}>{status}</span>; }
function Table({ title, empty, rows }: { title: string; empty: string; rows: Array<Array<string | number>> }) { return <section className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal"><h2 className="font-display text-5xl uppercase">{title}</h2>{rows.length ? <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left text-sm font-bold"><tbody>{rows.map((row, index) => <tr key={index} className="border-t-2 border-ink">{row.map((cell, cellIndex) => <td key={cellIndex} className="p-3">{cellIndex === row.length - 1 && typeof cell === "string" && /^[A-Z_]+$/.test(cell) ? <Badge status={cell} /> : cell}</td>)}</tr>)}</tbody></table></div> : <p className="mt-3 rounded-xl bg-stallYellow p-3 font-black">{empty}</p>}</section>; }
function CampaignApprovals({ campaigns }: { campaigns: any[] }) { return <section className="rounded-2xl border-4 border-ink bg-stallYellow p-5 shadow-brutal"><h2 className="font-display text-5xl uppercase">Advertiser campaigns</h2><div className="mt-3 grid gap-3">{campaigns.map((campaign: any) => { const activeStatus = flightStatus(campaign.startsAt, campaign.endsAt); const primaryPlacement = campaign.inventory?.venue.name || campaign.placements?.[0]?.inventory?.venue.name || "Inventory TBD"; return <article key={campaign.id} className="rounded-xl border-2 border-ink bg-white p-3"><p className="flex flex-wrap gap-2"><Badge status={campaign.status} /><Badge status={campaign.approvalStatus} /><Badge status={activeStatus.toUpperCase()} /> <span className="font-black">Total {money(campaign.totalAmountCents || campaign.priceCents)}</span></p><h3 className="font-display text-3xl uppercase">{campaign.businessName}: {campaign.headline}</h3><p className="font-bold">{campaign.advertiser.name} • {primaryPlacement} • {campaign.flightStartMonth}–{campaign.flightEndMonth} • {campaign.flightMonths || campaign.months} month(s) • {campaign.placementCount || campaign.locationCount} placement(s) • {campaign.paidAt ? "Paid" : "Unpaid"}</p><p className="mt-1 text-sm font-bold uppercase text-stallPurple">Flight status: {activeStatus} · {money(campaign.pricePerPlacementMonthCents || 5000)} per placement month</p>{campaign.rejectionReason ? <p className="mt-1 font-bold text-stallRed">Rejected: {campaign.rejectionReason}</p> : null}<div className="mt-2 grid gap-2 md:grid-cols-2"><form action={approveAdCampaign.bind(null, campaign.id)} className="grid gap-2"><input name="adminApprovalNote" placeholder="Approval note optional" className="rounded border-2 border-ink p-2"/><button className="rounded bg-ink px-3 py-2 font-black uppercase text-white">Approve</button></form><form action={rejectAdCampaign.bind(null, campaign.id)} className="grid gap-2"><input name="rejectionReason" placeholder="Rejection reason" className="rounded border-2 border-ink p-2"/><button className="rounded bg-stallRed px-3 py-2 font-black uppercase text-white">Reject</button></form></div></article>; })}{campaigns.length === 0 ? <p className="rounded-xl bg-white p-3 font-black">No advertiser campaigns yet.</p> : null}</div></section>; }

function Payments({ payments }: { payments: any[] }) { return <Table title="Payments" empty="No payments have been recorded yet." rows={payments.map((payment) => [payment.advertiser.name, payment.campaign.name, money(payment.amountCents), payment.status])} />; }
function VenueDrafts({ drafts }: { drafts: any[] }) { return <section id="venue-drafts" className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal"><h2 className="font-display text-5xl uppercase">Venue content drafts</h2><div className="mt-3 grid gap-3">{drafts.map((draft) => <article key={draft.id} className="rounded-xl border-2 border-ink bg-paper p-3"><p className="flex flex-wrap gap-2"><Badge status={draft.approvalStatus} /><span className="font-black">{draft.venue.name}</span></p><h3 className="font-display text-3xl uppercase">{draft.title}</h3><p className="font-bold">{draft.body}</p>{draft.rejectionReason ? <p className="mt-1 font-bold text-stallRed">Rejected: {draft.rejectionReason}</p> : null}<div className="mt-2 grid gap-2 md:grid-cols-2"><form action={approveVenueContentDraft.bind(null, draft.id)} className="grid gap-2"><input name="adminNote" placeholder="Approval note optional" className="rounded border-2 border-ink p-2"/><button className="rounded bg-ink px-3 py-2 font-black uppercase text-white">Approve draft</button></form><form action={rejectVenueContentDraft.bind(null, draft.id)} className="grid gap-2"><input name="rejectionReason" placeholder="Rejection reason" className="rounded border-2 border-ink p-2"/><button className="rounded bg-stallRed px-3 py-2 font-black uppercase text-white">Reject draft</button></form><form action={publishVenueContentDraft.bind(null, draft.id)} className="grid gap-2 md:col-span-2"><button className="rounded bg-stallYellow px-3 py-2 font-black uppercase">Publish draft</button></form></div></article>)}{drafts.length === 0 ? <p className="rounded-xl bg-stallYellow p-3 font-black">No venue drafts yet.</p> : null}</div></section>; }
