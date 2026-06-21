import { percent } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export default async function AnalyticsPage() {
  const [totalScans, adImpressions, adClicks, couponRedemptions, visitors, sessions, timeEvents, topVenueRows, topAdRows] = await Promise.all([
    prisma.analyticsEvent.count({ where: { type: "SCAN" } }),
    prisma.analyticsEvent.count({ where: { type: "AD_IMPRESSION" } }),
    prisma.analyticsEvent.count({ where: { type: "AD_CLICK" } }),
    prisma.analyticsEvent.count({ where: { type: "COUPON_REDEMPTION" } }),
    prisma.analyticsEvent.groupBy({ by: ["visitorId"], where: { visitorId: { not: null } }, _count: { visitorId: true } }),
    prisma.analyticsEvent.groupBy({ by: ["sessionId"], where: { sessionId: { not: null } } }),
    prisma.analyticsEvent.findMany({ where: { type: "TIME_ON_PAGE", durationMs: { not: null } }, select: { durationMs: true } }),
    prisma.analyticsEvent.groupBy({ by: ["venueId"], where: { venueId: { not: null } }, _count: { venueId: true }, orderBy: { _count: { venueId: "desc" } }, take: 5 }),
    prisma.analyticsEvent.groupBy({ by: ["adId"], where: { adId: { not: null } }, _count: { adId: true }, orderBy: { _count: { adId: "desc" } }, take: 5 })
  ]);
  const repeatVisitors = visitors.filter((visitor) => visitor._count.visitorId > 1).length;
  const averageMs = timeEvents.length ? Math.round(timeEvents.reduce((sum, event) => sum + (event.durationMs || 0), 0) / timeEvents.length) : 0;
  const topVenues = await prisma.venue.findMany({ where: { id: { in: topVenueRows.map((row) => row.venueId).filter(Boolean) as string[] } } });
  const topAds = await prisma.ad.findMany({ where: { id: { in: topAdRows.map((row) => row.adId).filter(Boolean) as string[] } }, include: { advertiser: true } });
  const [impressionsByAd, clicksByAd, clicksByQr, clicksByVenue, clicksByRestroom, clicksBySlot] = await Promise.all([
    prisma.analyticsEvent.groupBy({ by: ["adId"], where: { type: "AD_IMPRESSION", adId: { not: null } }, _count: { adId: true }, orderBy: { _count: { adId: "desc" } }, take: 10 }),
    prisma.analyticsEvent.groupBy({ by: ["adId"], where: { type: "AD_CLICK", adId: { not: null } }, _count: { adId: true }, orderBy: { _count: { adId: "desc" } }, take: 10 }),
    prisma.analyticsEvent.groupBy({ by: ["qrCodeId"], where: { type: "AD_CLICK", qrCodeId: { not: null } }, _count: { qrCodeId: true }, orderBy: { _count: { qrCodeId: "desc" } }, take: 10 }),
    prisma.analyticsEvent.groupBy({ by: ["venueId"], where: { type: "AD_CLICK", venueId: { not: null } }, _count: { venueId: true }, orderBy: { _count: { venueId: "desc" } }, take: 10 }),
    prisma.analyticsEvent.groupBy({ by: ["restroomId"], where: { type: "AD_CLICK", restroomId: { not: null } }, _count: { restroomId: true }, orderBy: { _count: { restroomId: "desc" } }, take: 10 }),
    prisma.analyticsEvent.groupBy({ by: ["slotNumber"], where: { type: "AD_CLICK", slotNumber: { not: null } }, _count: { slotNumber: true }, orderBy: { _count: { slotNumber: "desc" } }, take: 10 }),
  ]);
  const cards = [["Total scans", totalScans], ["Unique visitors", visitors.length], ["Repeat visitors", repeatVisitors], ["Avg time", `${Math.round(averageMs / 1000)}s`], ["Ad impressions", adImpressions], ["Ad clicks", adClicks], ["CTR", percent(adImpressions ? adClicks / adImpressions : 0)], ["Coupon redemptions", couponRedemptions], ["Sessions", sessions.length]];
  const panel = (title: string, rows: string[]) => <section className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal"><h2 className="font-display text-4xl uppercase">{title}</h2>{rows.map((row) => <p key={row} className="mt-2 rounded bg-paper p-3 font-black">{row}</p>)}</section>;
  return <section><h1 className="font-display text-7xl uppercase">Analytics</h1><p className="font-bold">Publisher-grade scan, visitor, time-on-page, ad, coupon, venue, and advertiser reporting.</p><div className="mt-6 grid gap-4 md:grid-cols-3 lg:grid-cols-5">{cards.map(([label, value]) => <div key={label} className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal"><p className="font-black uppercase text-stallRed">{label}</p><p className="font-display text-4xl uppercase leading-none">{value}</p></div>)}</div><div className="mt-8 grid gap-6 md:grid-cols-2">{panel("Top Venues", topVenueRows.map((row) => `${topVenues.find((venue) => venue.id === row.venueId)?.name || row.venueId}: ${row._count.venueId} events`))}{panel("Top Clicked Ads", clicksByAd.map((row) => `${row.adId}: ${row._count.adId} clicks`))}{panel("Impressions by Ad", impressionsByAd.map((row) => `${row.adId}: ${row._count.adId} impressions`))}{panel("Clicks by QR Code", clicksByQr.map((row) => `${row.qrCodeId}: ${row._count.qrCodeId} clicks`))}{panel("Clicks by Venue/Restroom", [...clicksByVenue.map((row) => `Venue ${row.venueId}: ${row._count.venueId}`), ...clicksByRestroom.map((row) => `Restroom ${row.restroomId}: ${row._count.restroomId}`)] )}{panel("Clicks by Ad Slot", clicksBySlot.map((row) => `Slot ${row.slotNumber}: ${row._count.slotNumber} clicks`))}</div></section>;
}
