import { percent } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { SPONSOR_PLACEMENTS, sponsorPlacementLabel, sponsorPlacementSection } from "@/lib/sponsor-placements";

export const dynamic = "force-dynamic";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

export default async function AnalyticsPage() {
  const [totalScans, adImpressions, adClicks, couponRedemptions, visitors, sessions, timeEvents, topVenueRows, topAdRows, placementEvents, activeAds, recentInteraction] = await Promise.all([
    prisma.analyticsEvent.count({ where: { type: "SCAN" } }),
    prisma.analyticsEvent.count({ where: { type: "AD_IMPRESSION" } }),
    prisma.analyticsEvent.count({ where: { type: "AD_CLICK" } }),
    prisma.analyticsEvent.count({ where: { type: "COUPON_REDEMPTION" } }),
    prisma.analyticsEvent.groupBy({ by: ["visitorId"], where: { visitorId: { not: null } }, _count: { visitorId: true } }),
    prisma.analyticsEvent.groupBy({ by: ["sessionId"], where: { sessionId: { not: null } } }),
    prisma.analyticsEvent.findMany({ where: { type: "TIME_ON_PAGE", durationMs: { not: null } }, select: { durationMs: true } }),
    prisma.analyticsEvent.groupBy({ by: ["venueId"], where: { venueId: { not: null } }, _count: { venueId: true }, orderBy: { _count: { venueId: "desc" } }, take: 5 }),
    prisma.analyticsEvent.groupBy({ by: ["adId"], where: { adId: { not: null } }, _count: { adId: true }, orderBy: { _count: { adId: "desc" } }, take: 5 }),
    prisma.analyticsEvent.findMany({ where: { slotNumber: { not: null } }, include: { venue: true, issue: true, qrCode: true, ad: true }, orderBy: { createdAt: "desc" }, take: 5000 }),
    prisma.ad.findMany({ where: { status: "ACTIVE" }, select: { id: true, monthlyPriceCents: true } }),
    prisma.analyticsEvent.findFirst({ orderBy: { createdAt: "desc" }, include: { venue: true, issue: true, qrCode: true, ad: true } }),
  ]);
  const repeatVisitors = visitors.filter((visitor) => visitor._count.visitorId > 1).length;
  const averageMs = timeEvents.length ? Math.round(timeEvents.reduce((sum, event) => sum + (event.durationMs || 0), 0) / timeEvents.length) : 0;
  const topVenues = await prisma.venue.findMany({ where: { id: { in: topVenueRows.map((row) => row.venueId).filter(Boolean) as string[] } } });
  const topAds = await prisma.ad.findMany({ where: { id: { in: topAdRows.map((row) => row.adId).filter(Boolean) as string[] } }, include: { advertiser: true } });
  const [impressionsByAd, clicksByAd, clicksByQr, clicksByVenue, clicksByRestroom] = await Promise.all([
    prisma.analyticsEvent.groupBy({ by: ["adId"], where: { type: "AD_IMPRESSION", adId: { not: null } }, _count: { adId: true }, orderBy: { _count: { adId: "desc" } }, take: 10 }),
    prisma.analyticsEvent.groupBy({ by: ["adId"], where: { type: "AD_CLICK", adId: { not: null } }, _count: { adId: true }, orderBy: { _count: { adId: "desc" } }, take: 10 }),
    prisma.analyticsEvent.groupBy({ by: ["qrCodeId"], where: { type: "AD_CLICK", qrCodeId: { not: null } }, _count: { qrCodeId: true }, orderBy: { _count: { qrCodeId: "desc" } }, take: 10 }),
    prisma.analyticsEvent.groupBy({ by: ["venueId"], where: { type: "AD_CLICK", venueId: { not: null } }, _count: { venueId: true }, orderBy: { _count: { venueId: "desc" } }, take: 10 }),
    prisma.analyticsEvent.groupBy({ by: ["restroomId"], where: { type: "AD_CLICK", restroomId: { not: null } }, _count: { restroomId: true }, orderBy: { _count: { restroomId: "desc" } }, take: 10 }),
  ]);

  const adRevenue = new Map(activeAds.map((ad) => [ad.id, ad.monthlyPriceCents]));
  const placementRows = SPONSOR_PLACEMENTS.map((placement) => {
    const events = placementEvents.filter((event) => event.slotNumber === placement.number);
    const impressions = events.filter((event) => event.type === "AD_IMPRESSION").length;
    const clicks = events.filter((event) => event.type === "AD_CLICK").length;
    const conversions = events.filter((event) => event.type === "COUPON_REDEMPTION").length;
    const qrScans = events.filter((event) => event.type === "SCAN").length;
    const revenue = new Set(events.map((event) => event.adId).filter(Boolean) as string[]);
    return {
      placement: placement.label,
      section: placement.section,
      venue: events[0]?.venue?.name || "All venues",
      issue: events[0]?.issue?.title || "Current issue",
      impressions,
      clicks,
      ctr: percent(impressions ? clicks / impressions : 0),
      qrScans,
      conversions,
      revenue: money([...revenue].reduce((sum, adId) => sum + (adRevenue.get(adId) || 0), 0)),
      lastInteraction: events[0]?.createdAt ? events[0].createdAt.toLocaleString() : "—",
    };
  });
  const cards = [["QR scans", totalScans], ["Unique visitors", visitors.length], ["Repeat visitors", repeatVisitors], ["Avg time", `${Math.round(averageMs / 1000)}s`], ["Impressions", adImpressions], ["Clicks", adClicks], ["CTR", percent(adImpressions ? adClicks / adImpressions : 0)], ["Conversions", couponRedemptions], ["Sessions", sessions.length], ["Revenue", money(activeAds.reduce((sum, ad) => sum + ad.monthlyPriceCents, 0))], ["Last interaction", recentInteraction?.createdAt.toLocaleString() || "—"]];
  const panel = (title: string, rows: string[]) => <section className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal"><h2 className="font-display text-4xl uppercase">{title}</h2>{rows.map((row) => <p key={row} className="mt-2 rounded bg-paper p-3 font-black">{row}</p>)}</section>;
  return <section><h1 className="font-display text-7xl uppercase">Analytics</h1><p className="font-bold">Venue, issue, section, impressions, clicks, CTR, QR scans, conversions, revenue, and last-interaction reporting for the 8 Premium Sponsor Panels.</p><div className="mt-6 grid gap-4 md:grid-cols-3 lg:grid-cols-5">{cards.map(([label, value]) => <div key={label} className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal"><p className="font-black uppercase text-stallRed">{label}</p><p className="break-words font-display text-4xl uppercase leading-none">{value}</p></div>)}</div><section className="mt-8 overflow-x-auto rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal"><h2 className="font-display text-5xl uppercase">Sponsor placement analytics</h2><table className="mt-4 w-full min-w-[980px] text-left text-sm"><thead><tr>{["Sponsor Placement","Venue","Issue","Section","Impressions","Clicks","CTR","QR scans","Conversions","Revenue","Last interaction"].map((head) => <th key={head} className="border-b-2 border-ink p-2 font-black uppercase">{head}</th>)}</tr></thead><tbody>{placementRows.map((row) => <tr key={row.placement} className="odd:bg-paper"><td className="p-2 font-black">{row.placement}</td><td className="p-2">{row.venue}</td><td className="p-2">{row.issue}</td><td className="p-2">{row.section}</td><td className="p-2">{row.impressions}</td><td className="p-2">{row.clicks}</td><td className="p-2">{row.ctr}</td><td className="p-2">{row.qrScans}</td><td className="p-2">{row.conversions}</td><td className="p-2">{row.revenue}</td><td className="p-2">{row.lastInteraction}</td></tr>)}</tbody></table></section><div className="mt-8 grid gap-6 md:grid-cols-2">{panel("Top Venues", topVenueRows.map((row) => `${topVenues.find((venue) => venue.id === row.venueId)?.name || row.venueId}: ${row._count.venueId} events`))}{panel("Top Clicked Ads", clicksByAd.map((row) => `${topAds.find((ad) => ad.id === row.adId)?.businessName || row.adId}: ${row._count.adId} clicks`))}{panel("Impressions by Ad", impressionsByAd.map((row) => `${row.adId}: ${row._count.adId} impressions`))}{panel("Clicks by QR Code", clicksByQr.map((row) => `${row.qrCodeId}: ${row._count.qrCodeId} clicks`))}{panel("Clicks by Venue/Restroom", [...clicksByVenue.map((row) => `Venue ${row.venueId}: ${row._count.venueId}`), ...clicksByRestroom.map((row) => `Restroom ${row.restroomId}: ${row._count.restroomId}`)] )}{panel("Clicks by Sponsor Placement", placementRows.map((row) => `${row.placement}: ${row.clicks} clicks`))}</div></section>;
}
