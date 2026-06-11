import { createAdvertiserCampaign } from "@/lib/actions";
import { authEnvStatus, currentUser } from "@/lib/auth";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const SLOT_PRICE_CENTS = 5000;

function missingDb(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return /does not exist|P2021|AdSlotInventory|AdCampaign|User/i.test(message);
}

export default async function AdvertiserPortalPage() {
  const auth = authEnvStatus();
  const user = await currentUser();
  const whereAdvertiser = user?.role === "ADVERTISER" && user.advertiserId ? { id: user.advertiserId } : {};
  try {
    const [advertisers, inventory, campaigns] = await Promise.all([
      prisma.advertiser.findMany({ where: whereAdvertiser, orderBy: { name: "asc" } }),
      prisma.adSlotInventory.findMany({ where: { status: "OPEN" }, include: { venue: true, restroom: true, qrCode: true }, orderBy: [{ month: "asc" }, { slotNumber: "asc" }] }),
      prisma.adCampaign.findMany({ where: user?.role === "ADVERTISER" && user.advertiserId ? { advertiserId: user.advertiserId } : {}, include: { advertiser: true, inventory: { include: { venue: true, restroom: true, qrCode: true } } }, orderBy: { createdAt: "desc" } })
    ]);
    const selectedAdvertiser = advertisers[0];
    return <main className="min-h-screen bg-paper p-4 text-ink md:p-8"><h1 className="font-display text-7xl uppercase">Advertiser Dashboard</h1><p className="max-w-4xl font-bold">Reserve paid Potty Favor inventory at {money(SLOT_PRICE_CENTS)} per ad slot per month per toilet/QR location. Draft campaigns stay unpublished until Stripe payment succeeds.</p>{!auth.isConfigured ? <Setup message="Set AUTH_SECRET and DATABASE_URL to restrict this dashboard to signed-in advertiser users." /> : null}<section className="mt-6 rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal"><h2 className="font-display text-5xl uppercase">Available locations & open slots</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{inventory.map((slot) => <article key={slot.id} className="rounded-xl border-2 border-ink bg-paper p-3"><p className="text-xs font-black uppercase text-stallRed">{slot.month} • Slot {slot.slotNumber} • {money(slot.priceCents)}/month</p><h3 className="font-display text-3xl uppercase">{slot.venue.name}</h3><p className="font-bold">{slot.venue.city}, {slot.venue.state} • {slot.restroom?.name || "Venue-wide"} • QR {slot.qrCode?.code || "TBD"}</p></article>)}</div>{inventory.length === 0 ? <p className="mt-4 rounded-xl bg-stallYellow p-3 font-black">No open ad slot inventory has been created yet.</p> : null}</section><section className="mt-6 rounded-2xl border-4 border-ink bg-stallYellow p-5 shadow-brutal"><h2 className="font-display text-5xl uppercase">Generate/upload creative & save draft</h2><form action={createAdvertiserCampaign} className="mt-4 grid gap-3 md:grid-cols-2"><select name="advertiserId" defaultValue={selectedAdvertiser?.id || ""} className="rounded border-2 border-ink p-3">{advertisers.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select><select name="inventoryId" className="rounded border-2 border-ink p-3">{inventory.map((slot) => <option key={slot.id} value={slot.id}>{slot.venue.name} • {slot.month} • Slot {slot.slotNumber}</option>)}</select><input name="name" placeholder="Campaign name" className="rounded border-2 border-ink p-3" /><input name="businessName" placeholder="Business name" required className="rounded border-2 border-ink p-3" /><input name="headline" placeholder="Ad headline" required className="rounded border-2 border-ink p-3" /><input name="creativeUrl" placeholder="Uploaded/generated creative URL" className="rounded border-2 border-ink p-3" /><input name="targetUrl" placeholder="Website" className="rounded border-2 border-ink p-3" /><input name="ctaText" placeholder="CTA" className="rounded border-2 border-ink p-3" /><input name="months" type="number" min="1" defaultValue="1" className="rounded border-2 border-ink p-3" /><input name="locationCount" type="number" min="1" defaultValue="1" className="rounded border-2 border-ink p-3" /><textarea name="body" placeholder="Offer/body copy" required className="rounded border-2 border-ink p-3 md:col-span-2" /><button className="rounded-xl bg-ink px-5 py-3 font-black uppercase text-white md:col-span-2">Save draft campaign</button></form></section><section className="mt-6 rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal"><h2 className="font-display text-5xl uppercase">Campaigns</h2><div className="mt-4 grid gap-3">{campaigns.map((campaign) => <article key={campaign.id} className="rounded-xl border-2 border-ink p-3"><p className="text-xs font-black uppercase text-stallRed">{campaign.status} • Approval {campaign.approvalStatus} • {money(campaign.priceCents)}</p><h3 className="font-display text-3xl uppercase">{campaign.businessName}: {campaign.headline}</h3><p className="font-bold">{campaign.inventory?.venue.name || "Inventory TBD"} • {campaign.months} month(s) × {campaign.locationCount} location(s)</p><form method="POST" action="/api/stripe/checkout"><input type="hidden" name="campaignId" value={campaign.id} /><button className="mt-2 rounded bg-stallRed px-4 py-2 font-black uppercase text-white">Pay with Stripe Checkout</button></form></article>)}</div></section></main>;
  } catch (error) {
    if (!missingDb(error)) throw error;
    return <main className="min-h-screen bg-paper p-8 text-ink"><h1 className="font-display text-7xl uppercase">Advertiser Dashboard</h1><Setup message="Run Prisma migrations to create Phase 2A advertiser inventory tables." /></main>;
  }
}

function Setup({ message }: { message: string }) { return <p className="mt-4 rounded-2xl border-4 border-ink bg-stallYellow p-5 font-black shadow-brutal">{message}</p>; }
