import Link from "next/link";
import { AdvertiserProfileRequired, advertiserForPortalUser, requireAdvertiserPortalUser } from "@/lib/advertiser-portal";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default async function AdvertiserCampaignsPage() {
  const user = await requireAdvertiserPortalUser();
  const advertiser = await advertiserForPortalUser(user);
  if (!advertiser) return <AdvertiserProfileRequired message="Complete your advertiser profile before viewing campaigns." />;
  const [campaigns, targets] = await Promise.all([
    prisma.adCampaign.findMany({ where: { advertiserId: advertiser.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.venue.findMany({
      where: { isActive: true, status: "ACTIVE", issues: { some: { status: "PUBLISHED", isPublished: true, isArchived: false } } },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        venueType: true,
        restrooms: { where: { status: "ACTIVE" }, select: { id: true, name: true, restroomType: true, customTypeLabel: true } },
        issues: { where: { status: "PUBLISHED", isPublished: true, isArchived: false }, select: { id: true, title: true, month: true, year: true, issueNumber: true }, orderBy: { publishedAt: "desc" }, take: 5 },
      },
      orderBy: { name: "asc" },
      take: 50,
    }),
  ]);
  return (
    <main className="min-h-screen bg-paper p-8 text-ink">
      <section className="mx-auto max-w-5xl rounded-2xl border-4 border-ink bg-white p-6 shadow-brutal">
        <p className="font-black uppercase tracking-[.25em] text-stallRed">Advertiser Portal</p>
        <h1 className="font-display text-6xl uppercase">Campaigns</h1>
        <p className="mt-2 font-bold">Review submitted, draft, paid, and active advertiser campaigns.</p>
        <Link href="/portal/advertiser" className="mt-4 inline-flex font-black uppercase text-stallPurple underline">Back to Advertiser Portal</Link>
        <div className="mt-6 grid gap-3">
          {campaigns.length ? campaigns.map((campaign) => <article key={campaign.id} className="rounded-xl border-2 border-ink bg-paper p-4"><p className="text-xs font-black uppercase text-stallRed">{campaign.status} • Approval {campaign.approvalStatus} • {money(campaign.totalAmountCents)}</p><h2 className="font-display text-4xl uppercase">{campaign.name}</h2><p className="font-bold">{campaign.headline}</p><p>{campaign.body}</p></article>) : <p className="rounded-xl border-2 border-ink bg-stallYellow p-4 font-black uppercase">No campaigns yet.</p>}
        </div>
      </section>
      <section className="mx-auto mt-6 max-w-5xl rounded-2xl border-4 border-ink bg-white p-6 shadow-brutal">
        <p className="font-black uppercase tracking-[.25em] text-stallPurple">Available public targeting</p>
        <h2 className="font-display text-5xl uppercase">Venues, Restrooms & Issues</h2>
        <p className="font-bold">Only active venues with published issues are listed here. Private venue drafts are not exposed.</p>
        <div className="mt-4 grid gap-3">
          {targets.map((venue) => <article key={venue.id} className="rounded-xl border-2 border-ink bg-paper p-4"><h3 className="font-display text-3xl uppercase">{venue.name}</h3><p className="font-black uppercase text-stallRed">{venue.city}, {venue.state} • {venue.venueType}</p><div className="mt-2 grid gap-2 md:grid-cols-2"><label className="font-black uppercase">Select restroom/type<select name="restroomTarget" className="mt-1 w-full rounded border-2 border-ink p-2"><option value={`venue:${venue.id}`}>Venue-wide</option>{venue.restrooms.map((r) => <option key={r.id} value={`restroom:${r.id}`}>{r.name} • {r.customTypeLabel || r.restroomType.replaceAll("_", " ")}</option>)}</select></label><label className="font-black uppercase">Published issue/event<select name="issueTarget" className="mt-1 w-full rounded border-2 border-ink p-2">{venue.issues.map((issue) => <option key={issue.id} value={issue.id}>{issue.title} • {issue.month} {issue.year} #{issue.issueNumber}</option>)}</select></label></div></article>)}
        </div>
      </section>
    </main>
  );
}
