import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileOnboarding } from "@/components/portal/ProfileOnboarding";

export const dynamic = "force-dynamic";
const clickTypes = ["AD_CLICK", "COUPON_CLICK", "COUPON_REDEMPTION"] as const;

export default async function VenueIssueAnalyticsPage() {
  const user = await currentUser();
  if (!user) redirect("/signin?error=admin_required");
  const venue = user.venueId ? await prisma.venue.findUnique({ where: { id: user.venueId }, include: { issues: { orderBy: { updatedAt: "desc" }, include: { events: { orderBy: { createdAt: "desc" }, take: 8 }, qrScans: { orderBy: { scannedAt: "desc" }, take: 8 } } } } }) : null;
  if (!venue) return <main className="min-h-screen bg-paper p-8 text-ink"><ProfileOnboarding title="Link your venue to see issue analytics" endpoint="/api/portal/venue/profile" button="Save Venue Profile" fields={[{ name: "venueName", label: "Venue name" }, { name: "address", label: "Address" }, { name: "city", label: "City" }, { name: "state", label: "State" }]} /></main>;
  const rows = await Promise.all(venue.issues.map(async (issue) => {
    const [views, qrScans, adImpressions, adClicks] = await Promise.all([
      prisma.analyticsEvent.count({ where: { venueId: venue.id, issueId: issue.id, type: { in: ["PAGE_VIEW", "ISSUE_VIEW"] } } }),
      prisma.qrScan.count({ where: { venueId: venue.id, issueId: issue.id } }),
      prisma.analyticsEvent.count({ where: { venueId: venue.id, issueId: issue.id, type: "AD_IMPRESSION" } }),
      prisma.analyticsEvent.count({ where: { venueId: venue.id, issueId: issue.id, type: { in: [...clickTypes] } } })
    ]);
    return { issue, views, qrScans, adImpressions, adClicks };
  }));
  return <main className="min-h-screen bg-paper p-8 text-ink"><header><p className="font-black uppercase tracking-[.25em] text-stallRed">Issue Analytics</p><h1 className="font-display text-6xl uppercase">{venue.name}</h1></header><section className="mt-6 grid gap-5">{rows.map(({ issue, views, qrScans, adImpressions, adClicks }) => <article id={issue.id} key={issue.id} className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal"><h2 className="font-display text-3xl uppercase">{issue.title}</h2><p className="font-black uppercase text-stallRed">{issue.status} • {issue.month} {issue.year}</p><div className="mt-4 grid gap-3 md:grid-cols-4">{[["Views", views], ["QR scans", qrScans], ["Ad impressions", adImpressions], ["Ad clicks", adClicks]].map(([label, value]) => <div key={label} className="rounded-xl border-4 border-ink bg-paper p-4"><p className="font-black uppercase text-stallRed">{label}</p><p className="font-display text-4xl">{value}</p></div>)}</div><div className="mt-4"><h3 className="font-black uppercase">Recent activity</h3><ul className="mt-2 grid gap-2">{[...issue.events.map((event) => ({ at: event.createdAt, label: event.type, detail: event.path || event.sessionId || "Analytics event" })), ...issue.qrScans.map((scan) => ({ at: scan.scannedAt, label: "QR_SCAN", detail: [scan.deviceType, scan.city, scan.state].filter(Boolean).join(" • ") || scan.sessionId || "QR scan" }))].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 8).map((activity, index) => <li key={`${activity.label}-${index}`} className="rounded-xl bg-paper p-3 font-bold"><span className="font-black text-stallRed">{activity.label}</span> {activity.detail} <span className="text-sm opacity-70">{activity.at.toLocaleString()}</span></li>)}{!issue.events.length && !issue.qrScans.length && <li className="rounded-xl bg-paper p-3 font-bold">No activity recorded yet.</li>}</ul></div></article>)}{!rows.length && <div className="rounded-2xl border-4 border-ink bg-white p-6 shadow-brutal"><h2 className="font-display text-4xl uppercase">No issues to analyze yet</h2><p className="font-black">Create a venue issue to start collecting views, scans, impressions, and clicks.</p></div>}</section></main>;
}
