import Link from "next/link";
import {
  AdvertiserProfileRequired,
  advertiserForPortalUser,
  requireAdvertiserPortalUser,
} from "@/lib/advertiser-portal";
import { ensureQrRouteAdInventory, hasAdSlotInventoryIssueIdColumn, qrRouteInventoryWhere } from "@/lib/advertiser-route-inventory";
import { prisma } from "@/lib/prisma";
import { restroomLabelSelect } from "@/lib/restroom-schema";

export const dynamic = "force-dynamic";

const audienceOptions = [
  ["", "Any audience segment"],
  ["VENUE_MENS", "Men's"],
  ["VENUE_WOMENS", "Women's"],
  ["ALL_RESTROOMS", "All Restrooms"],
  ["FAMILY_ALL_GENDER", "Family/All-gender"],
  ["CUSTOM", "Custom"],
] as const;

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function pct(clicks: number, impressions: number) {
  return impressions ? ((clicks / impressions) * 100).toFixed(2) : "0.00";
}

function label(value?: string | null) {
  return value ? value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase()) : "—";
}

function routeUrl(qr: { shortUrl?: string | null; qrSlug: string; destinationUrl?: string | null }) {
  return qr.shortUrl || `/q/${qr.qrSlug}` || qr.destinationUrl || "#";
}

function dateRange(filters: Record<string, string | undefined>) {
  const from = filters.startDate ? new Date(filters.startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const to = filters.endDate ? new Date(`${filters.endDate}T23:59:59.999Z`) : new Date();
  return { from: Number.isNaN(from.getTime()) ? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) : from, to: Number.isNaN(to.getTime()) ? new Date() : to };
}

export default async function AdvertiserInventoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireAdvertiserPortalUser();
  const advertiser = await advertiserForPortalUser(user);
  if (!advertiser) return <AdvertiserProfileRequired message="Complete your advertiser profile before browsing inventory." />;

  const filters = await searchParams;
  const range = dateRange(filters);
  const routeQrs = await prisma.qrCode.findMany({
    where: { venueId: { not: null }, status: { in: ["ACTIVE", "DEPLOYED"] }, venue: { is: { status: "ACTIVE", isActive: true } } },
    select: { id: true },
    take: 300,
  });
  const includeIssueIdColumn = await hasAdSlotInventoryIssueIdColumn();
  await Promise.all(routeQrs.map((qr) => ensureQrRouteAdInventory(qr.id)));

  const where = qrRouteInventoryWhere(filters, { includeIssueIdColumn });
  const [inventory, venues, issues, scanCounts, events] = await Promise.all([
    prisma.adSlotInventory.findMany({
      where,
      select: {
        id: true,
        venueId: true,
        restroomId: true,
        qrCodeId: true,
        slotNumber: true,
        audienceSegment: true,
        locationLabel: true,
        priceCents: true,
        status: true,
        venue: true,
        restroom: { select: restroomLabelSelect },
        qrCode: true,
        toiletLocation: true,
      },
      orderBy: [{ venue: { name: "asc" } }, { qrCode: { qrSlug: "asc" } }, { slotNumber: "asc" }],
      take: 150,
    }),
    prisma.venue.findMany({
      where: { isActive: true, status: "ACTIVE", qrCodes: { some: { status: { in: ["ACTIVE", "DEPLOYED"] } } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.issue.findMany({
      where: { venueId: { not: null }, status: "PUBLISHED", isPublished: true, isArchived: false },
      include: { qrCode: true },
      orderBy: [{ publishedAt: "desc" }, { year: "desc" }, { issueNumber: "desc" }],
      take: 500,
    }),
    prisma.qrScan.groupBy({ by: ["qrCodeId"], where: { scannedAt: { gte: range.from, lte: range.to } }, _count: { qrCodeId: true } }),
    prisma.analyticsEvent.findMany({
      where: { qrCodeId: { not: null }, createdAt: { gte: range.from, lte: range.to }, type: { in: ["PAGE_VIEW", "ISSUE_VIEW", "AD_IMPRESSION", "AD_CLICK", "COUPON_REDEMPTION"] as any } },
      select: { qrCodeId: true, type: true, slotNumber: true },
      take: 10000,
    }),
  ]);

  const currentIssueForRoute = (slot: (typeof inventory)[number]) =>
    issues.find((issue) => issue.qrCodeId === slot.qrCodeId) ||
    issues.find((issue) => issue.venueId === slot.venueId && issue.restroomId === slot.restroomId) ||
    issues.find((issue) => issue.venueId === slot.venueId && !issue.restroomId) ||
    null;
  const scansByQr = new Map(scanCounts.map((row) => [row.qrCodeId, row._count.qrCodeId]));
  const routeEvents = (qrCodeId: string, slotNumber: number) => events.filter((event) => event.qrCodeId === qrCodeId && (!event.slotNumber || event.slotNumber === slotNumber));
  const statuses = ["", "OPEN", "RESERVED", "SOLD", "DISABLED"];

  return (
    <main className="min-h-screen bg-paper p-8 text-ink">
      <section className="mx-auto max-w-7xl">
        <p className="font-black uppercase tracking-[.25em] text-stallRed">Advertiser Portal</p>
        <h1 className="font-display text-6xl uppercase">Browse QR Route Inventory</h1>
        <p className="mt-2 max-w-4xl font-bold">Buy sponsor placements on permanent venue QR audience routes for a campaign date range. Ads follow whatever published issue is current behind that QR route.</p>
        <Link href="/portal/advertiser" className="mt-4 inline-flex font-black uppercase text-stallPurple underline">Back to Advertiser Portal</Link>

        <form className="mt-6 grid gap-3 rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal md:grid-cols-3 xl:grid-cols-4">
          <select name="venueId" defaultValue={filters.venueId || ""} className="rounded border-2 border-ink p-3"><option value="">All venues</option>{venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}</select>
          <input name="location" defaultValue={filters.location || ""} placeholder="Location, city, state, restroom" className="rounded border-2 border-ink p-3" />
          <input name="qrRoute" defaultValue={filters.qrRoute || ""} placeholder="Permanent QR route" className="rounded border-2 border-ink p-3" />
          <select name="audienceSegment" defaultValue={filters.audienceSegment || ""} className="rounded border-2 border-ink p-3">{audienceOptions.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>
          <input name="slotType" defaultValue={filters.slotType || ""} placeholder="Sponsor slot number" className="rounded border-2 border-ink p-3" />
          <select name="status" defaultValue={filters.status || "OPEN"} className="rounded border-2 border-ink p-3">{statuses.map((status) => <option key={status || "any"} value={status}>{status || "Any availability"}</option>)}</select>
          <input type="date" name="startDate" defaultValue={filters.startDate || ""} className="rounded border-2 border-ink p-3" />
          <input type="date" name="endDate" defaultValue={filters.endDate || ""} className="rounded border-2 border-ink p-3" />
          <input name="eventCategory" defaultValue={filters.eventCategory || ""} placeholder="Optional event/category" className="rounded border-2 border-ink p-3 md:col-span-2" />
          <button className="rounded bg-ink p-3 font-black uppercase text-white md:col-span-2">Search QR route inventory</button>
        </form>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          {inventory.map((slot) => {
            if (!slot.qrCode) return null;
            const issue = currentIssueForRoute(slot);
            const analytics = routeEvents(slot.qrCode.id, slot.slotNumber);
            const views = analytics.filter((event) => ["PAGE_VIEW", "ISSUE_VIEW"].includes(event.type)).length;
            const impressions = analytics.filter((event) => event.type === "AD_IMPRESSION").length;
            const clicks = analytics.filter((event) => ["AD_CLICK", "COUPON_REDEMPTION"].includes(event.type)).length;
            const campaignHref = `/portal/advertiser/campaigns?inventoryId=${encodeURIComponent(slot.id)}&qrCodeId=${encodeURIComponent(slot.qrCode.id)}&slotNumber=${slot.slotNumber}&audienceSegment=${encodeURIComponent(slot.audienceSegment)}${filters.startDate ? `&startDate=${encodeURIComponent(filters.startDate)}` : ""}${filters.endDate ? `&endDate=${encodeURIComponent(filters.endDate)}` : ""}`;
            return (
              <article key={slot.id} className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal">
                <p className="text-xs font-black uppercase tracking-widest text-stallRed">{slot.status} • Sponsor Placement {slot.slotNumber} • {money(slot.priceCents)}</p>
                <h2 className="font-display text-4xl uppercase">{slot.venue.name}</h2>
                <p className="font-black">{slot.qrCode.qrName} • {label(slot.audienceSegment)}</p>
                <p className="mt-1 font-bold">Stable route: <Link href={routeUrl(slot.qrCode)} className="text-stallPurple underline">{routeUrl(slot.qrCode)}</Link></p>
                <p className="font-bold">Currently served issue: {issue ? `${issue.title} • ${issue.month} ${issue.year}` : "No published issue assigned yet"}</p>
                <div className="mt-3 grid gap-2 text-sm font-bold md:grid-cols-2">
                  <p>Route/location: {slot.toiletLocation?.label || slot.locationLabel || slot.restroom?.name || "Venue-wide"}</p>
                  <p>QR slug: {slot.qrCode.qrSlug}</p>
                  <p>Scans: {scansByQr.get(slot.qrCode.id) || 0}</p>
                  <p>Views: {views}</p>
                  <p>Impressions: {impressions}</p>
                  <p>Clicks/CTR: {clicks} / {pct(clicks, impressions)}%</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={routeUrl(slot.qrCode)} className="rounded bg-stallYellow px-4 py-2 font-black uppercase">Open QR Route</Link>
                  <Link href={campaignHref} className="rounded bg-stallRed px-4 py-2 font-black uppercase text-white">Reserve Placement / Start Campaign</Link>
                </div>
              </article>
            );
          })}
          {!inventory.length ? <p className="rounded-xl border-4 border-ink bg-stallYellow p-5 font-black uppercase lg:col-span-2">No public QR route inventory matches these filters.</p> : null}
        </section>
      </section>
    </main>
  );
}
