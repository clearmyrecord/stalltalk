import Link from "next/link";
import {
  AdvertiserProfileRequired,
  advertiserForPortalUser,
  requireAdvertiserPortalUser,
} from "@/lib/advertiser-portal";
import { adSlotInventoryColumnOptions, advertiserInventoryWhere, ensurePublishedIssueInventoryForAdvertiserRoutes, getAdSlotInventoryColumns, isOptionalAdSlotInventoryColumnError, logOptionalAdSlotInventoryColumnError, optionalVenueLocationRows } from "@/lib/advertiser-route-inventory";
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
  const inventoryColumns = await getAdSlotInventoryColumns();
  const inventoryColumnOptions = adSlotInventoryColumnOptions(inventoryColumns);

  try {
    await ensurePublishedIssueInventoryForAdvertiserRoutes();
  } catch (error) {
    if (isOptionalAdSlotInventoryColumnError(error)) logOptionalAdSlotInventoryColumnError("advertiser inventory page generation", error);
    else console.error("advertiser inventory page generation failed", error);
  }

  const where = advertiserInventoryWhere(filters, inventoryColumnOptions);
  const inventoryQuery = prisma.adSlotInventory.findMany({
      where: where as any,
      select: {
        id: true,
        venueId: true,
        restroomId: true,
        qrCodeId: true,
        slotNumber: true,
        ...(inventoryColumnOptions.includeIssueIdColumn ? { issueId: true, issue: true } : {}),
        ...(inventoryColumnOptions.includeAudienceSegmentColumn ? { audienceSegment: true } : {}),
        ...(inventoryColumnOptions.includeLocationLabelColumn ? { locationLabel: true } : {}),
        priceCents: true,
        status: true,
        venue: true,
        restroom: { select: restroomLabelSelect },
        qrCode: true,
        toiletLocation: true,
      },
      orderBy: [{ venue: { name: "asc" } }, { qrCode: { qrSlug: "asc" } }, { slotNumber: "asc" }],
      take: 150,
    }).catch((error) => {
      if (isOptionalAdSlotInventoryColumnError(error)) {
        logOptionalAdSlotInventoryColumnError("advertiser inventory page query", error);
        return [];
      }
      throw error;
    });

  const [inventory, venues, issues, activeRoutes, assignedRoutes, inventoryRouteCount, scanCounts, events] = await Promise.all([
    inventoryQuery,
    prisma.venue.findMany({
      where: { isActive: true, status: "ACTIVE", qrCodes: { some: { status: { in: ["ACTIVE", "DEPLOYED"] } } } },
      select: { id: true, name: true, venueType: true },
      orderBy: { name: "asc" },
    }),
    prisma.issue.findMany({
      where: { status: "PUBLISHED", isPublished: true, isArchived: false },
      include: { qrCode: true },
      orderBy: [{ publishedAt: "desc" }, { year: "desc" }, { issueNumber: "desc" }],
      take: 500,
    }),
    prisma.qrCode.count({ where: { venueId: { not: null }, status: { in: ["ACTIVE", "DEPLOYED"] }, venue: { is: { status: "ACTIVE", isActive: true } } } }),
    prisma.qrCode.count({ where: { venueId: { not: null }, status: { in: ["ACTIVE", "DEPLOYED"] }, issueId: { not: null }, venue: { is: { status: "ACTIVE", isActive: true } } } }),
    prisma.adSlotInventory.count({ where: { qrCodeId: { not: null } } }),
    prisma.qrScan.groupBy({ by: ["qrCodeId"], where: { scannedAt: { gte: range.from, lte: range.to } }, _count: { qrCodeId: true } }),
    prisma.analyticsEvent.findMany({
      where: { qrCodeId: { not: null }, createdAt: { gte: range.from, lte: range.to }, type: { in: ["PAGE_VIEW", "ISSUE_VIEW", "AD_IMPRESSION", "AD_CLICK", "COUPON_REDEMPTION"] as any } },
      select: { qrCodeId: true, type: true, slotNumber: true },
      take: 10000,
    }),
  ]);

  const venueLocationRows = await optionalVenueLocationRows([...new Set(inventory.map((slot) => slot.venueId))]);
  const displayedInventory = filters.zip ? inventory.filter((slot) => venueLocationRows.get(slot.venueId)?.zip?.toLowerCase().includes(filters.zip!.toLowerCase())) : inventory;
  const venueTypes = [...new Set(venues.map((venue) => venue.venueType).filter(Boolean))];
  const venueFirstSlotIds = new Map(displayedInventory.map((slot) => [slot.venueId, slot.id]));
  const mapVenues = [...new Map(displayedInventory.map((slot) => [slot.venueId, slot.venue])).values()].map((venue) => ({ ...venue, firstSlotId: venueFirstSlotIds.get(venue.id), location: venueLocationRows.get(venue.id) }));
  const mappedVenues = mapVenues.filter((venue) => Number.isFinite(venue.location?.latitude) && Number.isFinite(venue.location?.longitude));
  const latitudes = mappedVenues.map((venue) => Number(venue.location?.latitude));
  const longitudes = mappedVenues.map((venue) => Number(venue.location?.longitude));
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const markerPosition = (latitude: number, longitude: number) => ({
    top: `${12 + (maxLatitude === minLatitude ? 38 : ((maxLatitude - latitude) / (maxLatitude - minLatitude)) * 76)}%`,
    left: `${10 + (maxLongitude === minLongitude ? 40 : ((longitude - minLongitude) / (maxLongitude - minLongitude)) * 78)}%`,
  });

  const currentIssueForRoute = (slot: (typeof inventory)[number]) =>
    ("issue" in slot && slot.issue ? slot.issue : null) ||
    issues.find((issue) => issue.id === slot.qrCode?.issueId) ||
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
          <input name="venueName" defaultValue={filters.venueName || ""} placeholder="Venue name" className="rounded border-2 border-ink p-3" />
          <input name="city" defaultValue={filters.city || ""} placeholder="City" className="rounded border-2 border-ink p-3" />
          <input name="state" defaultValue={filters.state || ""} placeholder="State" className="rounded border-2 border-ink p-3" />
          <input name="zip" defaultValue={filters.zip || ""} placeholder="Zip/postal code" className="rounded border-2 border-ink p-3" />
          <select name="venueType" defaultValue={filters.venueType || ""} className="rounded border-2 border-ink p-3"><option value="">Any venue type</option>{venueTypes.map((type) => <option key={type} value={type}>{label(type)}</option>)}</select>
          <input name="location" defaultValue={filters.location || ""} placeholder="Fallback location/restroom search" className="rounded border-2 border-ink p-3" />
          <input name="qrRoute" defaultValue={filters.qrRoute || ""} placeholder="Permanent QR route" className="rounded border-2 border-ink p-3" />
          <select name="audienceSegment" defaultValue={filters.audienceSegment || ""} className="rounded border-2 border-ink p-3">{audienceOptions.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>
          <input name="slotType" defaultValue={filters.slotType || ""} placeholder="Sponsor slot number" className="rounded border-2 border-ink p-3" />
          <select name="status" defaultValue={filters.status || "OPEN"} className="rounded border-2 border-ink p-3">{statuses.map((status) => <option key={status || "any"} value={status}>{status || "Any availability"}</option>)}</select>
          <input type="date" name="startDate" defaultValue={filters.startDate || ""} className="rounded border-2 border-ink p-3" />
          <input type="date" name="endDate" defaultValue={filters.endDate || ""} className="rounded border-2 border-ink p-3" />
          <input name="eventCategory" defaultValue={filters.eventCategory || ""} placeholder="Optional event/category" className="rounded border-2 border-ink p-3 md:col-span-2" />
          <button className="rounded bg-ink p-3 font-black uppercase text-white md:col-span-2">Search QR route inventory</button>
        </form>

        <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="rounded-2xl border-4 border-ink bg-stallPurple p-5 text-white shadow-brutal lg:sticky lg:top-4 lg:self-start">
            <p className="font-black uppercase tracking-[.2em] text-stallYellow">Map-first venue search</p>
            <h2 className="font-display text-4xl uppercase">Available venues</h2>
            {mappedVenues.length ? <div className="relative mt-4 min-h-96 overflow-hidden rounded-xl border-4 border-ink bg-white text-ink">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,17,17,.08)_1px,transparent_1px),linear-gradient(rgba(17,17,17,.08)_1px,transparent_1px)] bg-[size:32px_32px]" />
              {mappedVenues.map((venue, index) => {
                const position = markerPosition(Number(venue.location?.latitude), Number(venue.location?.longitude));
                return <a key={venue.id} href={`#inventory-${venue.firstSlotId}`} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-ink bg-stallRed px-3 py-2 font-black text-white shadow-brutal" style={position} title={`${venue.name} (${venue.location?.latitude}, ${venue.location?.longitude})`}>{index + 1}</a>;
              })}
            </div> : <div className="mt-4 rounded-xl border-4 border-ink bg-white p-5 font-black uppercase text-ink">List-only fallback: no map API key is required, and no venue coordinates are available yet.</div>}
            <p className="mt-3 text-sm font-bold">Markers use saved venue latitude/longitude when available. Venues without coordinates remain in the list as “Map location pending.”</p>
          </div>
          <div className="grid gap-4">
          {displayedInventory.map((slot) => {
            if (!slot.qrCode) return null;
            const issue = currentIssueForRoute(slot);
            const analytics = routeEvents(slot.qrCode.id, slot.slotNumber);
            const views = analytics.filter((event) => ["PAGE_VIEW", "ISSUE_VIEW"].includes(event.type)).length;
            const impressions = analytics.filter((event) => event.type === "AD_IMPRESSION").length;
            const clicks = analytics.filter((event) => ["AD_CLICK", "COUPON_REDEMPTION"].includes(event.type)).length;
            const audienceSegment = "audienceSegment" in slot ? slot.audienceSegment : null;
            const locationLabel = "locationLabel" in slot ? slot.locationLabel : null;
            const campaignHref = `/portal/advertiser/campaigns?inventoryId=${encodeURIComponent(slot.id)}&qrCodeId=${encodeURIComponent(slot.qrCode.id)}&slotNumber=${slot.slotNumber}&audienceSegment=${encodeURIComponent(audienceSegment || "ALL_RESTROOMS")}${filters.startDate ? `&startDate=${encodeURIComponent(filters.startDate)}` : ""}${filters.endDate ? `&endDate=${encodeURIComponent(filters.endDate)}` : ""}`;
            return (
              <article key={slot.id} id={`inventory-${slot.id}`} className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal">
                <p className="text-xs font-black uppercase tracking-widest text-stallRed">{slot.status} • Sponsor Placement {slot.slotNumber} • {money(slot.priceCents)}</p>
                <h2 className="font-display text-4xl uppercase">{slot.venue.name}</h2>
                <p className="font-bold">{slot.venue.address}, {slot.venue.city}, {slot.venue.state}{venueLocationRows.get(slot.venueId)?.zip ? ` ${venueLocationRows.get(slot.venueId)?.zip}` : ""} • {label(slot.venue.venueType)}</p>
                <p className="text-sm font-black uppercase text-stallPurple">{Number.isFinite(venueLocationRows.get(slot.venueId)?.latitude) && Number.isFinite(venueLocationRows.get(slot.venueId)?.longitude) ? "Mapped venue location" : "Map location pending"}</p>
                <p className="font-black">{slot.qrCode.qrName} • {label(audienceSegment)}</p>
                <p className="mt-1 font-bold">Stable route: <Link href={routeUrl(slot.qrCode)} className="text-stallPurple underline">{routeUrl(slot.qrCode)}</Link></p>
                <p className="font-bold">Currently served issue: {issue ? `${issue.title} • ${issue.month} ${issue.year}` : "No current issue yet"}</p>
                {issue ? <p className="text-sm font-black uppercase text-stallRed">{issue.venueId ? "Default issue currently serving this route" : "Global fallback issue"}</p> : null}
                <div className="mt-3 grid gap-2 text-sm font-bold md:grid-cols-2">
                  <p>Route/location: {slot.toiletLocation?.label || locationLabel || slot.restroom?.name || "Venue-wide"}</p>
                  <p>QR slug: {slot.qrCode.qrSlug}</p>
                  <p>Scans: {scansByQr.get(slot.qrCode.id) || 0}</p>
                  <p>Views: {views}</p>
                  <p>Impressions: {impressions}</p>
                  <p>Clicks/CTR: {clicks} / {pct(clicks, impressions)}%</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={routeUrl(slot.qrCode)} className="rounded bg-stallYellow px-4 py-2 font-black uppercase">Open QR Route</Link>
                  <Link href={campaignHref} className="rounded bg-stallRed px-4 py-2 font-black uppercase text-white">View Inventory / Reserve Placement</Link>
                </div>
              </article>
            );
          })}
          {!displayedInventory.length ? <div className="rounded-xl border-4 border-ink bg-stallYellow p-5 font-black uppercase"><p>No public QR route inventory matches these filters.</p><p className="mt-2 text-sm">Debug-safe inventory status: {activeRoutes ? `${activeRoutes} active QR route${activeRoutes === 1 ? "" : "s"} exist.` : "No active QR routes exist for public inventory."} {activeRoutes && !assignedRoutes ? "No published issue is assigned directly to an active QR route yet; a global/default fallback issue may still serve routes when configured." : ""} {activeRoutes && !inventoryRouteCount ? "No inventory rows were generated yet for those QR routes." : `${inventoryRouteCount} QR-route inventory row${inventoryRouteCount === 1 ? "" : "s"} exist before filters.`}</p></div> : null}
          </div>
        </section>
      </section>
    </main>
  );
}
