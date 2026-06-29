import Link from "next/link";
import {
  AdvertiserProfileRequired,
  advertiserForPortalUser,
  requireAdvertiserPortalUser,
} from "@/lib/advertiser-portal";
import { ensureIssueAdInventory, publishedIssueInventoryWhere } from "@/lib/issue-inventory";
import { prisma } from "@/lib/prisma";
import { restroomLabelSelect } from "@/lib/restroom-schema";

export const dynamic = "force-dynamic";

const audienceOptions = [
  ["", "Any audience segment"],
  ["VENUE_MENS", "Men's restrooms"],
  ["VENUE_WOMENS", "Women's restrooms"],
  ["ALL_RESTROOMS", "All restrooms"],
  ["FAMILY_ALL_GENDER", "Family/all-gender"],
  ["SPECIFIC_RESTROOM", "Custom/restroom route"],
] as const;

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function publicIssueHref(issue: { publicUrl?: string | null; slug?: string | null } | null, qrSlug?: string | null) {
  if (issue?.publicUrl) return issue.publicUrl;
  if (issue?.slug) return `/issue/${issue.slug}`;
  if (qrSlug) return `/qr/${qrSlug}`;
  return "#";
}

function label(value?: string | null) {
  return value ? value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase()) : "—";
}

export default async function AdvertiserInventoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireAdvertiserPortalUser();
  const advertiser = await advertiserForPortalUser(user);
  if (!advertiser) return <AdvertiserProfileRequired message="Complete your advertiser profile before browsing inventory." />;

  const filters = await searchParams;
  const publishedIssues = await prisma.issue.findMany({
    where: { venueId: { not: null }, status: "PUBLISHED", isPublished: true, isArchived: false },
    select: { id: true },
    orderBy: [{ year: "desc" }, { issueNumber: "desc" }],
    take: 200,
  });
  await Promise.all(publishedIssues.map((issue) => ensureIssueAdInventory(issue.id)));

  const where = publishedIssueInventoryWhere(filters);
  const [inventory, venues, issues] = await Promise.all([
    prisma.adSlotInventory.findMany({
      where,
      include: {
        venue: true,
        restroom: { select: restroomLabelSelect },
        qrCode: true,
        toiletLocation: true,
        issue: { include: { importedEvents: { where: { status: { in: ["APPROVED", "PUBLISHED"] } }, take: 1 } } },
      },
      orderBy: [{ month: "asc" }, { venue: { name: "asc" } }, { slotNumber: "asc" }],
      take: 150,
    }),
    prisma.venue.findMany({
      where: { isActive: true, status: "ACTIVE", issues: { some: { status: "PUBLISHED", isPublished: true, isArchived: false } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.issue.findMany({
      where: { venueId: { not: null }, status: "PUBLISHED", isPublished: true, isArchived: false },
      select: { id: true, title: true, month: true, year: true, venue: { select: { name: true } } },
      orderBy: [{ year: "desc" }, { issueNumber: "desc" }],
      take: 150,
    }),
  ]);

  const statuses = ["", "OPEN", "RESERVED", "SOLD", "DISABLED"];

  return (
    <main className="min-h-screen bg-paper p-8 text-ink">
      <section className="mx-auto max-w-7xl">
        <p className="font-black uppercase tracking-[.25em] text-stallRed">Advertiser Portal</p>
        <h1 className="font-display text-6xl uppercase">Browse Inventory</h1>
        <p className="mt-2 max-w-4xl font-bold">Search public ad placements from published, non-archived venue issues only. Draft and unpublished issues are excluded.</p>
        <Link href="/portal/advertiser" className="mt-4 inline-flex font-black uppercase text-stallPurple underline">Back to Advertiser Portal</Link>

        <form className="mt-6 grid gap-3 rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal md:grid-cols-3 xl:grid-cols-4">
          <select name="venueId" defaultValue={filters.venueId || ""} className="rounded border-2 border-ink p-3"><option value="">All venues</option>{venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}</select>
          <select name="issueId" defaultValue={filters.issueId || ""} className="rounded border-2 border-ink p-3"><option value="">All issue titles</option>{issues.map((issue) => <option key={issue.id} value={issue.id}>{issue.venue?.name} • {issue.title} • {issue.month} {issue.year}</option>)}</select>
          <input name="month" defaultValue={filters.month || ""} placeholder="Month (YYYY-MM)" className="rounded border-2 border-ink p-3" />
          <input name="year" defaultValue={filters.year || ""} placeholder="Year" className="rounded border-2 border-ink p-3" />
          <select name="audienceSegment" defaultValue={filters.audienceSegment || ""} className="rounded border-2 border-ink p-3">{audienceOptions.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>
          <input name="qrRoute" defaultValue={filters.qrRoute || ""} placeholder="Restroom/QR route" className="rounded border-2 border-ink p-3" />
          <input name="slotType" defaultValue={filters.slotType || ""} placeholder="Sponsor slot type/number" className="rounded border-2 border-ink p-3" />
          <input name="eventCategory" defaultValue={filters.eventCategory || ""} placeholder="Location/category/event" className="rounded border-2 border-ink p-3" />
          <input name="location" defaultValue={filters.location || ""} placeholder="City, state, venue, restroom" className="rounded border-2 border-ink p-3 md:col-span-2" />
          <select name="status" defaultValue={filters.status || "OPEN"} className="rounded border-2 border-ink p-3">{statuses.map((status) => <option key={status || "any"} value={status}>{status || "Any availability"}</option>)}</select>
          <button className="rounded bg-ink p-3 font-black uppercase text-white">Search inventory</button>
        </form>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          {inventory.map((slot) => {
            const href = publicIssueHref(slot.issue, slot.qrCode?.qrSlug);
            const campaignHref = `/portal/advertiser/campaigns?inventoryId=${encodeURIComponent(slot.id)}&issueId=${encodeURIComponent(slot.issueId || "")}&slotNumber=${slot.slotNumber}&audienceSegment=${encodeURIComponent(slot.audienceSegment)}&month=${encodeURIComponent(slot.month)}`;
            return (
              <article key={slot.id} className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal">
                <p className="text-xs font-black uppercase tracking-widest text-stallRed">{slot.status} • Sponsor Placement {slot.slotNumber} • {money(slot.priceCents)}</p>
                <h2 className="font-display text-4xl uppercase">{slot.venue.name}</h2>
                <p className="font-black">{slot.issue?.title || "Published issue"} • {slot.issue?.month} {slot.issue?.year} • Inventory month {slot.month}</p>
                <div className="mt-3 grid gap-2 text-sm font-bold md:grid-cols-2">
                  <p>Audience: {label(slot.audienceSegment)}</p>
                  <p>Route: {slot.qrCode?.qrSlug || slot.restroom?.slug || "Venue issue"}</p>
                  <p>Location: {slot.toiletLocation?.label || slot.locationLabel || slot.restroom?.name || slot.venue.city || "Venue-wide"}</p>
                  <p>Category/event: {slot.eventCategory || slot.issue?.importedEvents[0]?.category || "—"}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={href} className="rounded bg-stallYellow px-4 py-2 font-black uppercase">Public issue / QR route</Link>
                  <Link href={campaignHref} className="rounded bg-stallRed px-4 py-2 font-black uppercase text-white">Select Placement / Start Campaign</Link>
                </div>
              </article>
            );
          })}
          {!inventory.length ? <p className="rounded-xl border-4 border-ink bg-stallYellow p-5 font-black uppercase lg:col-span-2">No public available inventory matches these filters.</p> : null}
        </section>
      </section>
    </main>
  );
}
