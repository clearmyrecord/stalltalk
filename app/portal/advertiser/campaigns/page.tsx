import Link from "next/link";
import { createAdvertiserCampaign } from "@/lib/actions";
import {
  AdvertiserProfileRequired,
  advertiserForPortalUser,
  requireAdvertiserPortalUser,
} from "@/lib/advertiser-portal";
import { publishedIssueInventoryWhere } from "@/lib/issue-inventory";
import { prisma } from "@/lib/prisma";
import { restroomLabelSelect } from "@/lib/restroom-schema";

export const dynamic = "force-dynamic";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default async function AdvertiserCampaignsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireAdvertiserPortalUser();
  const advertiser = await advertiserForPortalUser(user);
  if (!advertiser) return <AdvertiserProfileRequired message="Complete your advertiser profile before viewing campaigns." />;
  const filters = await searchParams;
  const [campaigns, inventory, venues, issues] = await Promise.all([
    prisma.adCampaign.findMany({ where: { advertiserId: advertiser.id }, orderBy: { createdAt: "desc" }, take: 50, include: { placements: { include: { inventory: { include: { venue: true, issue: true } } } } } }),
    prisma.adSlotInventory.findMany({
      where: publishedIssueInventoryWhere(filters),
      include: { venue: true, restroom: { select: restroomLabelSelect }, qrCode: true, issue: { include: { importedEvents: { where: { status: { in: ["APPROVED", "PUBLISHED"] } }, take: 1 } } } },
      orderBy: [{ month: "asc" }, { venue: { name: "asc" } }, { slotNumber: "asc" }],
      take: 100,
    }),
    prisma.venue.findMany({ where: { isActive: true, status: "ACTIVE", issues: { some: { status: "PUBLISHED", isPublished: true, isArchived: false } } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.issue.findMany({ where: { venueId: { not: null }, status: "PUBLISHED", isPublished: true, isArchived: false }, select: { id: true, title: true, month: true, year: true, venue: { select: { name: true } } }, orderBy: [{ year: "desc" }, { issueNumber: "desc" }], take: 100 }),
  ]);
  return (
    <main className="min-h-screen bg-paper p-8 text-ink">
      <section className="mx-auto max-w-6xl rounded-2xl border-4 border-ink bg-white p-6 shadow-brutal">
        <p className="font-black uppercase tracking-[.25em] text-stallRed">Advertiser Portal</p>
        <h1 className="font-display text-6xl uppercase">Campaigns</h1>
        <p className="mt-2 font-bold">Browse published venue issue inventory, select sponsor slots, and submit campaign placements. Draft and unpublished venue issues are not shown.</p>
        <div className="mt-4 flex flex-wrap gap-3"><Link href="/portal/advertiser" className="font-black uppercase text-stallPurple underline">Back to Advertiser Portal</Link><Link href="/portal/advertiser/inventory" className="font-black uppercase text-stallRed underline">Browse Inventory</Link></div>
        <div className="mt-6 grid gap-3">
          {campaigns.length ? campaigns.map((campaign) => (
            <article key={campaign.id} className="rounded-xl border-2 border-ink bg-paper p-4">
              <p className="text-xs font-black uppercase text-stallRed">{campaign.status} • Approval {campaign.approvalStatus} • {money(campaign.totalAmountCents)}</p>
              <h2 className="font-display text-4xl uppercase">{campaign.name}</h2>
              <p className="font-bold">{campaign.headline}</p>
              <p>{campaign.body}</p>
              {campaign.placements.length ? <p className="mt-2 text-sm font-black uppercase">{campaign.placements.length} selected issue slot(s)</p> : null}
            </article>
          )) : <p className="rounded-xl border-2 border-ink bg-stallYellow p-4 font-black uppercase">No campaigns yet.</p>}
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-6xl rounded-2xl border-4 border-ink bg-white p-6 shadow-brutal">
        <p className="font-black uppercase tracking-[.25em] text-stallPurple">Issue Inventory Search</p>
        <h2 className="font-display text-5xl uppercase">Published Venue Issues</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-3">
          <select name="venueId" defaultValue={filters.venueId || ""} className="rounded border-2 border-ink p-3"><option value="">All venues</option>{venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
          <select name="issueId" defaultValue={filters.issueId || ""} className="rounded border-2 border-ink p-3"><option value="">All issues</option>{issues.map((i) => <option key={i.id} value={i.id}>{i.venue?.name} • {i.title} • {i.month} {i.year}</option>)}</select>
          <input name="month" defaultValue={filters.month || ""} placeholder="Month YYYY-MM" className="rounded border-2 border-ink p-3" />
          <input name="year" defaultValue={filters.year || ""} placeholder="Year" className="rounded border-2 border-ink p-3" />
          <select name="audienceSegment" defaultValue={filters.audienceSegment || ""} className="rounded border-2 border-ink p-3"><option value="">Any restroom audience</option><option value="VENUE_MENS">Venue-wide men's</option><option value="VENUE_WOMENS">Venue-wide women's</option><option value="ALL_RESTROOMS">All restrooms</option><option value="SPECIFIC_RESTROOM">Specific restroom</option></select>
          <input name="eventCategory" defaultValue={filters.eventCategory || ""} placeholder="Event/category" className="rounded border-2 border-ink p-3" />
          <input name="location" defaultValue={filters.location || ""} placeholder="City, state, venue, restroom" className="rounded border-2 border-ink p-3 md:col-span-2" />
          <button className="rounded bg-ink p-3 font-black uppercase text-white">Filter inventory</button>
        </form>
        <form action={createAdvertiserCampaign} className="mt-6 grid gap-4">
          <input type="hidden" name="advertiserId" value={advertiser.id} />
          <div className="grid gap-3 md:grid-cols-2"><input name="businessName" defaultValue={advertiser.name} className="rounded border-2 border-ink p-3" required /><input name="name" placeholder="Campaign name" className="rounded border-2 border-ink p-3" required /><input name="headline" placeholder="Ad headline" className="rounded border-2 border-ink p-3" required /><input name="ctaText" defaultValue="Learn More" className="rounded border-2 border-ink p-3" /><input name="targetUrl" defaultValue="#" className="rounded border-2 border-ink p-3" /><input name="creativeUrl" placeholder="Creative image URL" className="rounded border-2 border-ink p-3" /><textarea name="body" placeholder="Offer/body" className="rounded border-2 border-ink p-3 md:col-span-2" required /></div>
          <div className="grid gap-3 md:grid-cols-3"><input name="flightStartMonth" defaultValue={filters.month || "2026-07"} className="rounded border-2 border-ink p-3" /><input name="flightMonths" defaultValue="1" className="rounded border-2 border-ink p-3" /><input name="budgetDollars" defaultValue="50" className="rounded border-2 border-ink p-3" /></div>
          <div className="grid gap-3 md:grid-cols-2">
            {inventory.map((slot) => (
              <label key={slot.id} className="rounded-xl border-2 border-ink bg-paper p-4 font-bold">
                <input type="checkbox" name="inventoryIds" value={slot.id} defaultChecked={filters.inventoryId === slot.id} className="mr-2" />
                <span className="font-black uppercase">Slot {slot.slotNumber} • {money(slot.priceCents)} • {slot.status}</span>
                <span className="block">{slot.venue.name} • {slot.issue?.title} • {slot.issue?.month} {slot.issue?.year}</span>
                <span className="block text-sm uppercase text-stallRed">{slot.audienceSegment.replaceAll("_", " ")} • {slot.restroom?.name || "All restrooms"} • {slot.qrCode?.qrSlug || slot.locationLabel || slot.venue.city}</span>
                {slot.eventCategory || slot.issue?.importedEvents[0]?.category ? <span className="block text-sm">Category: {slot.eventCategory || slot.issue?.importedEvents[0]?.category}</span> : null}
              </label>
            ))}
          </div>
          {!inventory.length ? <p className="rounded-xl border-2 border-ink bg-stallYellow p-4 font-black uppercase">No available published issue inventory matches these filters.</p> : null}
          <button className="rounded bg-stallRed px-5 py-3 font-black uppercase text-white">Submit campaign for selected issue inventory</button>
        </form>
      </section>
    </main>
  );
}
