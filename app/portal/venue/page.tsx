import { redirect } from "next/navigation";
import { createVenueContentDraft, createVenueMediaAsset, signOutAction } from "@/lib/actions";
import { authEnvStatus, currentUser } from "@/lib/auth";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const metricTypes = [
  ["QR scans", "SCAN"],
  ["Issue views", "ISSUE_VIEW"],
  ["Ad impressions", "AD_IMPRESSION"],
  ["Ad clicks", "AD_CLICK"],
  ["Coupon clicks", "COUPON_CLICK"],
  ["Website visits", "WEBSITE_VISIT"]
] as const;

function badge(status: string) {
  return `rounded-full border-2 border-ink px-2 py-1 text-xs font-black uppercase ${status === "PUBLISHED" || status === "APPROVED" ? "bg-green-100" : status === "REJECTED" ? "bg-stallRed text-white" : "bg-stallYellow"}`;
}

function startFor(filter: string) {
  const now = new Date();
  if (filter === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filter === "7") return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (filter === "30") return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default async function VenuePortalPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const params = await searchParams;
  const range = params.range || "30";
  const auth = authEnvStatus();
  const user = await currentUser();
  if (auth.isConfigured && (!user || (user.role !== "VENUE_MANAGER" && user.role !== "VENUE" && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN"))) redirect("/signin?error=role");
  const where = (user?.role === "VENUE_MANAGER" || user?.role === "VENUE") && user.venueId ? { id: user.venueId } : {};
  try {
    const venues = await prisma.venue.findMany({
      where,
      include: {
        restrooms: true,
        qrCodes: true,
        issues: { orderBy: [{ year: "desc" }, { issueNumber: "desc" }], take: 2 },
        events: { where: { createdAt: { gte: startFor(range) } } },
        mediaAssets: { orderBy: { createdAt: "desc" } },
        venueContentDrafts: { orderBy: { createdAt: "desc" } },
        adSlotInventories: { include: { campaigns: { include: { advertiser: true }, where: { OR: [{ status: "ACTIVE" }, { status: "PAID", approvalStatus: "APPROVED" }] } }, restroom: true, qrCode: true } }
      },
      orderBy: { name: "asc" }
    });
    return <main className="min-h-screen bg-paper p-4 text-ink md:p-8"><div className="flex flex-wrap items-center gap-3"><div><p className="font-black uppercase tracking-[.25em] text-stallRed">Venue management portal</p><h1 className="font-display text-6xl uppercase md:text-7xl">Venue Dashboard</h1></div><form action={signOutAction} className="ml-auto"><button className="rounded-xl bg-stallRed px-4 py-3 font-black uppercase text-white">Logout</button></form></div><p className="max-w-4xl font-bold">Venue managers can manage only their assigned venue, content, media, ads, events, promotions, coupons, and analytics. Admin approval is required unless direct publishing is enabled for that venue.</p>{!auth.isConfigured ? <p className="mt-4 rounded-xl border-4 border-ink bg-stallYellow p-4 font-black">Set AUTH_SECRET and DATABASE_URL to restrict venues to assigned properties.</p> : null}<nav className="mt-4 flex flex-wrap gap-2">{[["today", "Today"], ["7", "7 days"], ["30", "30 days"], ["issue", "Current issue"]].map(([value, label]) => <a key={value} href={`/portal/venue?range=${value}`} className={`rounded-xl border-2 border-ink px-3 py-2 font-black uppercase ${range === value ? "bg-ink text-white" : "bg-white"}`}>{label}</a>)}</nav><div className="mt-6 grid gap-6">{venues.map((venue) => { const currentIssue = venue.issues[0]; const upcomingIssue = venue.issues[1]; const activeCampaigns = venue.adSlotInventories.flatMap((slot) => slot.campaigns.filter((campaign) => !campaign.endsAt || campaign.endsAt >= new Date()).map((campaign) => ({ ...campaign, slot }))); const upcomingCampaigns = venue.adSlotInventories.flatMap((slot) => slot.campaigns.filter((campaign) => campaign.startsAt && campaign.startsAt > new Date()).map((campaign) => ({ ...campaign, slot }))); const metricCount = (type: string) => venue.events.filter((event) => event.type === type || (type === "ISSUE_VIEW" && event.type === "PAGE_VIEW") || (type === "COUPON_CLICK" && event.type === "COUPON_REDEMPTION")).length; return <section key={venue.id} className="rounded-2xl border-4 border-ink bg-white p-4 shadow-brutal md:p-5"><p className="text-xs font-black uppercase text-stallRed">{venue.city}, {venue.state} • {venue.directPublishingApproved ? "Direct publishing" : "Approval workflow"}</p><h2 className="font-display text-5xl uppercase">{venue.name}</h2><div className="mt-4 grid gap-3 md:grid-cols-4">{[["Current issue", currentIssue ? `${currentIssue.month} ${currentIssue.year} #${currentIssue.issueNumber}` : "Not scheduled"], ["Upcoming issue", upcomingIssue ? `${upcomingIssue.month} ${upcomingIssue.year} #${upcomingIssue.issueNumber}` : "Not scheduled"], ["Active advertisements", activeCampaigns.length], ["Upcoming advertisements", upcomingCampaigns.length]].map(([label, value]) => <div key={label} className="rounded-xl border-2 border-ink bg-stallYellow p-3"><p className="text-xs font-black uppercase text-stallRed">{label}</p><p className="font-display text-3xl uppercase">{value}</p></div>)}</div><section className="mt-4 rounded-xl border-2 border-ink bg-paper p-3"><h3 className="font-display text-3xl uppercase">Scan analytics & monthly performance</h3><div className="mt-2 grid gap-2 md:grid-cols-6">{metricTypes.map(([label, type]) => <div key={type} className="rounded-lg border-2 border-ink bg-white p-3"><p className="text-xs font-black uppercase text-stallRed">{label}</p><p className="font-display text-4xl">{metricCount(type)}</p></div>)}</div></section><section className="mt-4 rounded-xl border-2 border-ink bg-stallYellow p-3"><h3 className="font-display text-3xl uppercase">Advertisements</h3><div className="mt-2 grid gap-2 md:grid-cols-2">{activeCampaigns.concat(upcomingCampaigns).map((campaign: any) => <article key={campaign.id} className="rounded-lg border-2 border-ink bg-white p-3"><p className="font-black uppercase text-stallRed">{campaign.slot.month} • Slot {campaign.slot.slotNumber} • {money(campaign.priceCents)}</p><h4 className="font-display text-2xl uppercase">{campaign.businessName}</h4><p className="font-bold">{campaign.advertiser.name} • {campaign.headline}</p></article>)}{activeCampaigns.length + upcomingCampaigns.length === 0 ? <p className="rounded-lg bg-white p-3 font-black">No active or upcoming advertiser campaigns are assigned.</p> : null}</div></section><form action={createVenueContentDraft} className="mt-4 grid gap-3 rounded-xl bg-paper p-3 md:grid-cols-2"><h3 className="font-display text-3xl uppercase md:col-span-2">Create venue content</h3><input type="hidden" name="venueId" value={venue.id} /><select name="contentType" className="rounded border-2 border-ink p-3 font-bold"><option value="ANNOUNCEMENT">Announcement</option><option value="PROMOTION">Promotion</option><option value="EVENT">Event</option><option value="RESTAURANT_REVIEW">Restaurant review</option><option value="PHOTO">Photo</option><option value="COUPON">Coupon</option><option value="FEATURED_CONTENT">Featured content</option></select><input name="title" placeholder="Title" required className="rounded border-2 border-ink p-3" /><textarea name="body" placeholder="Description / review / offer details" required className="rounded border-2 border-ink p-3 md:col-span-2" /><input name="startsAt" type="datetime-local" className="rounded border-2 border-ink p-3" /><input name="endsAt" type="datetime-local" className="rounded border-2 border-ink p-3" /><input name="location" placeholder="Event location" className="rounded border-2 border-ink p-3" /><input name="category" placeholder="Category (happy hour, hotel package, entertainment...)" className="rounded border-2 border-ink p-3" /><input name="imageUrl" placeholder="Image URL" className="rounded border-2 border-ink p-3" /><input name="websiteUrl" placeholder="Website" className="rounded border-2 border-ink p-3" /><input name="couponCode" placeholder="Coupon code" className="rounded border-2 border-ink p-3" /><input name="qrDestination" placeholder="QR destination" className="rounded border-2 border-ink p-3" /><input name="expiresAt" type="datetime-local" className="rounded border-2 border-ink p-3" /><button className="rounded bg-ink px-4 py-2 font-black uppercase text-white md:col-span-2">{venue.directPublishingApproved ? "Publish content" : "Submit for approval"}</button></form><form action={createVenueMediaAsset} className="mt-4 grid gap-3 rounded-xl border-2 border-ink bg-white p-3 md:grid-cols-5"><h3 className="font-display text-3xl uppercase md:col-span-5">Media library</h3><input type="hidden" name="venueId" value={venue.id} /><select name="assetType" className="rounded border-2 border-ink p-3 font-bold"><option>IMAGE</option><option>LOGO</option><option>GALLERY</option></select><input name="title" placeholder="Asset title" required className="rounded border-2 border-ink p-3" /><input name="url" placeholder="Uploaded image/logo URL" required className="rounded border-2 border-ink p-3" /><input name="galleryName" placeholder="Gallery name" className="rounded border-2 border-ink p-3" /><button className="rounded bg-stallYellow p-3 font-black uppercase">Add media</button><div className="grid gap-2 md:col-span-5 md:grid-cols-3">{venue.mediaAssets.map((asset) => <p key={asset.id} className="rounded-lg border-2 border-ink bg-paper p-3 font-bold">{asset.assetType}: {asset.title}</p>)}</div></form><div className="mt-4 grid gap-2">{venue.venueContentDrafts.map((draft) => <article key={draft.id} className="rounded-lg border-2 border-ink p-3"><p className="flex flex-wrap gap-2"><span className={badge(draft.approvalStatus)}>{draft.approvalStatus}</span><span className="rounded-full bg-paper px-2 py-1 text-xs font-black uppercase">{draft.contentType}</span></p><h3 className="mt-2 font-display text-3xl uppercase">{draft.title}</h3><p className="font-bold">{draft.body}</p>{draft.startsAt ? <p className="font-bold">Dates: {draft.startsAt.toLocaleString()} {draft.endsAt ? `– ${draft.endsAt.toLocaleString()}` : ""}</p> : null}{draft.couponCode ? <p className="font-black text-stallRed">Coupon: {draft.couponCode}</p> : null}{draft.rejectionReason ? <p className="mt-1 font-black text-stallRed">Rejection reason: {draft.rejectionReason}</p> : null}</article>)}</div></section>; })}</div></main>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "");
    if (!/does not exist|P2021|VenueContentDraft|AdCampaign|VenueMediaAsset/i.test(message)) throw error;
    return <main className="min-h-screen bg-paper p-8 text-ink"><h1 className="font-display text-7xl uppercase">Venue Dashboard</h1><p className="mt-4 rounded-2xl border-4 border-ink bg-stallYellow p-5 font-black shadow-brutal">Run Prisma migrations to enable the venue management portal tables.</p></main>;
  }
}
