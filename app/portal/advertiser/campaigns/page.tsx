import Link from "next/link";
import { createAdvertiserCampaign } from "@/lib/actions";
import {
  AdvertiserProfileRequired,
  advertiserForPortalUser,
  requireAdvertiserPortalUser,
} from "@/lib/advertiser-portal";
import { adSlotInventoryColumnOptions, advertiserInventoryWhere, ensurePublishedIssueInventoryForAdvertiserRoutes, getAdSlotInventoryColumns } from "@/lib/advertiser-route-inventory";
import { prisma } from "@/lib/prisma";


export const dynamic = "force-dynamic";

const CAMPAIGN_DISPLAY_COLUMNS = [
  "id",
  "name",
  "headline",
  "body",
  "status",
  "approvalStatus",
  "totalAmountCents",
  "createdAt",
] as const;

function isMissingColumnError(error: unknown) {
  return (error as { code?: string })?.code === "P2022";
}

async function tableColumns(tableName: string) {
  const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = ${tableName}
  `;
  return new Set(rows.map((row) => row.column_name));
}

async function advertiserCampaignRows(advertiserId: string) {
  const campaignColumns = await tableColumns("AdCampaign");
  const select = Object.fromEntries(
    CAMPAIGN_DISPLAY_COLUMNS
      .filter((column) => campaignColumns.has(column))
      .map((column) => [column, true]),
  );

  if (!campaignColumns.has("advertiserId") || !campaignColumns.has("id")) return [];

  try {
    return (await prisma.adCampaign.findMany({
      where: { advertiserId },
      orderBy: campaignColumns.has("createdAt") ? { createdAt: "desc" } : undefined,
      take: 50,
      select: select as any,
    })) as Array<Record<string, any>>;
  } catch (error) {
    if (isMissingColumnError(error)) {
      console.warn("[advertiser-campaigns] Missing optional AdCampaign column; rendering empty state.", error);
      return [];
    }
    throw error;
  }
}

async function advertiserInventoryRows(filters: Record<string, string | undefined>) {
  const inventoryColumns = await tableColumns("AdSlotInventory");
  const select = {
    id: true,
    slotNumber: true,
    priceCents: true,
    status: true,
    ...(inventoryColumns.has("audienceSegment") ? { audienceSegment: true } : {}),
    ...(inventoryColumns.has("eventCategory") ? { eventCategory: true } : {}),
    ...(inventoryColumns.has("locationLabel") ? { locationLabel: true } : {}),
    venue: { select: { id: true, name: true, city: true } },
    restroom: { select: { id: true, name: true, slug: true } },
    qrCode: { select: { id: true, qrName: true, qrSlug: true, shortUrl: true } },
  };
  try {
    return (await prisma.adSlotInventory.findMany({
      where: qrRouteInventoryWhere(filters),
      select: select as any,
      orderBy: [{ venue: { name: "asc" } }, { qrCode: { qrSlug: "asc" } }, { slotNumber: "asc" }],
      take: 100,
    })) as Array<Record<string, any>>;
  } catch (error) {
    if (isMissingColumnError(error)) {
      console.warn("[advertiser-campaigns] Missing optional inventory column; rendering no inventory.", error);
      return [];
    }
    throw error;
  }
}


function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default async function AdvertiserCampaignsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireAdvertiserPortalUser();
  const advertiser = await advertiserForPortalUser(user);
  if (!user.advertiserId || !advertiser) return <AdvertiserProfileRequired message="Complete your advertiser profile before viewing campaigns." />;
  const filters = await searchParams;
  const inventoryColumns = await getAdSlotInventoryColumns();
  const inventoryColumnOptions = adSlotInventoryColumnOptions(inventoryColumns);
  await ensurePublishedIssueInventoryForAdvertiserRoutes();
  const [campaigns, inventory, venues] = await Promise.all([
const [campaigns, inventory, venues] = await Promise.all([
  advertiserCampaignRows(advertiser.advertiserId),

  prisma.adSlotInventory.findMany({
    where: advertiserInventoryWhere(filters),
    include: {
      venue: {
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          venueType: true,
          slug: true,
        },
      },
      restroom: {
        select: restroomLabelSelect,
      },
      qrCode: {
        select: {
          id: true,
          qrSlug: true,
          shortUrl: true,
          destinationUrl: true,
          status: true,
        },
      },
      ...(inventoryColumnOptions.includeIssueIdColumn
        ? {
            issue: {
              select: {
                id: true,
                title: true,
                month: true,
                year: true,
                issueNumber: true,
                status: true,
                isPublished: true,
              },
            },
          }
        : {}),
    },
    orderBy: [
      { venue: { name: "asc" } },
      { qrCode: { qrSlug: "asc" } },
      { slotNumber: "asc" },
    ],
    take: 100,
  }),

  prisma.venue.findMany({
    where: {
      isActive: true,
      status: "ACTIVE",
      qrCodes: {
        some: {
          status: {
            in: ["ACTIVE", "DEPLOYED"],
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  }),
]);
    prisma.venue.findMany({ where: { isActive: true, status: "ACTIVE", qrCodes: { some: { status: { in: ["ACTIVE", "DEPLOYED"] } } } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <main className="min-h-screen bg-paper p-8 text-ink">
      <section className="mx-auto max-w-6xl rounded-2xl border-4 border-ink bg-white p-6 shadow-brutal">
        <p className="font-black uppercase tracking-[.25em] text-stallRed">Advertiser Portal</p>
        <h1 className="font-display text-6xl uppercase">Campaigns</h1>
        <p className="mt-2 font-bold">Browse permanent QR route inventory, select sponsor slots, and submit campaign placements for a campaign date range.</p>
        <div className="mt-4 flex flex-wrap gap-3"><Link href="/portal/advertiser" className="font-black uppercase text-stallPurple underline">Back to Advertiser Portal</Link><Link href="/portal/advertiser/inventory" className="font-black uppercase text-stallRed underline">Browse Inventory</Link></div>
        <div className="mt-6 grid gap-3">
          {campaigns.length ? campaigns.map((campaign) => (
            <article key={campaign.id} className="rounded-xl border-2 border-ink bg-paper p-4">
              <p className="text-xs font-black uppercase text-stallRed">{campaign.status || "SUBMITTED"} • Approval {campaign.approvalStatus || "SUBMITTED"} • {money(campaign.totalAmountCents || 0)}</p>
              <h2 className="font-display text-4xl uppercase">{campaign.name || "Finished ad upload"}</h2>
              <p className="font-bold">{campaign.headline || "Uploaded ad"}</p>
              <p>{campaign.body || "Submitted for review."}</p>
            </article>
          )) : <p className="rounded-xl border-2 border-ink bg-stallYellow p-4 font-black uppercase">No campaigns yet.</p>}
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-6xl rounded-2xl border-4 border-ink bg-white p-6 shadow-brutal">
        <p className="font-black uppercase tracking-[.25em] text-stallPurple">QR Route Inventory Search</p>
        <h2 className="font-display text-5xl uppercase">Permanent QR Audience Routes</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-3">
          <select name="venueId" defaultValue={filters.venueId || ""} className="rounded border-2 border-ink p-3"><option value="">All venues</option>{venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
          <input name="qrRoute" defaultValue={filters.qrRoute || ""} placeholder="Permanent QR route" className="rounded border-2 border-ink p-3" />
          <select name="audienceSegment" defaultValue={filters.audienceSegment || ""} className="rounded border-2 border-ink p-3"><option value="">Any audience route</option><option value="VENUE_MENS">Men's</option><option value="VENUE_WOMENS">Women's</option><option value="ALL_RESTROOMS">All restrooms</option><option value="FAMILY_ALL_GENDER">Family/all-gender</option><option value="CUSTOM">Custom</option></select>
          <input name="slotType" defaultValue={filters.slotType || ""} placeholder="Sponsor slot number" className="rounded border-2 border-ink p-3" />
          <input name="location" defaultValue={filters.location || ""} placeholder="City, state, venue, restroom" className="rounded border-2 border-ink p-3 md:col-span-2" />
          <button className="rounded bg-ink p-3 font-black uppercase text-white">Filter QR routes</button>
        </form>
        <form action={createAdvertiserCampaign} className="mt-6 grid gap-4">
          <input type="hidden" name="advertiserId" value={advertiser.id} />
          <div className="grid gap-3 md:grid-cols-2"><input name="businessName" defaultValue={advertiser.name} className="rounded border-2 border-ink p-3" required /><input name="name" placeholder="Campaign name" className="rounded border-2 border-ink p-3" required /><input name="headline" placeholder="Ad headline" className="rounded border-2 border-ink p-3" required /><input name="ctaText" defaultValue="Learn More" className="rounded border-2 border-ink p-3" /><input name="targetUrl" defaultValue="#" className="rounded border-2 border-ink p-3" /><input name="creativeUrl" placeholder="Creative image URL" className="rounded border-2 border-ink p-3" /><textarea name="body" placeholder="Offer/body" className="rounded border-2 border-ink p-3 md:col-span-2" required /></div>
          <div className="grid gap-3 md:grid-cols-3"><input name="flightStartMonth" defaultValue={(filters.startDate || "2026-07").slice(0, 7)} className="rounded border-2 border-ink p-3" /><input name="flightMonths" defaultValue="1" className="rounded border-2 border-ink p-3" /><input name="budgetDollars" defaultValue="50" className="rounded border-2 border-ink p-3" /></div>
          <div className="grid gap-3 md:grid-cols-2">
            {inventory.map((slot) => (
              <label key={slot.id} className="rounded-xl border-2 border-ink bg-paper p-4 font-bold">
                <input type="checkbox" name="inventoryIds" value={slot.id} defaultChecked={filters.inventoryId === slot.id} className="mr-2" />
                <span className="font-black uppercase">Slot {slot.slotNumber} • {money(slot.priceCents)} • {slot.status}</span>
                <span className="block">{slot.venue.name} • {slot.qrCode?.qrName || slot.qrCode?.qrSlug || "QR route"}</span>
<span className="block text-sm uppercase text-stallRed">
  {((slot.audienceSegment as string | null) || "ALL_RESTROOMS").replaceAll("_", " ")}
  {" • "}
  {slot.restroom?.name || "All restrooms"}
  {" • "}
  {slot.qrCode?.shortUrl || slot.qrCode?.qrSlug || "QR route"}
</span>

{slot.eventCategory ? (
  <span className="block text-sm">Category: {slot.eventCategory}</span>
) : null}

{"issue" in slot && slot.issue ? (
  <span className="block text-sm">
    {slot.issue.title || "Default issue currently serving this route"}
  </span>
) : (
  <span className="block text-sm">Global fallback issue</span>
)}
              </label>
            ))}
          </div>
          {!inventory.length ? <p className="rounded-xl border-2 border-ink bg-stallYellow p-4 font-black uppercase">No available QR route inventory matches these filters.</p> : null}
          <button className="rounded bg-stallRed px-5 py-3 font-black uppercase text-white">Submit campaign for selected QR route inventory</button>
        </form>
      </section>
    </main>
  );
}
