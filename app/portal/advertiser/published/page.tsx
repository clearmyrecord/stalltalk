import Link from "next/link";
import {
  AdvertiserProfileRequired,
  advertiserForPortalUser,
  requireAdvertiserPortalUser,
} from "@/lib/advertiser-portal";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdvertiserPublishedPage() {
  const user = await requireAdvertiserPortalUser();
  const advertiser = await advertiserForPortalUser(user);
  if (!advertiser)
    return (
      <AdvertiserProfileRequired message="Complete your advertiser profile before viewing published ads." />
    );

  const [ads, campaigns] = await Promise.all([
    prisma.ad.findMany({
      where: { advertiserId: advertiser.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.stalltalkCampaignHistory.findMany({
      where: {
        advertiserId: advertiser.id,
        publishStatus: "PUBLISHED",
      },
      include: { ad: true },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 50,
    }),
  ]);

  const campaignAdIds = new Set(
    campaigns.map((campaign) => campaign.adId).filter(Boolean),
  );
  const standaloneAds = ads.filter((ad) => !campaignAdIds.has(ad.id));

  return (
    <main className="min-h-screen bg-paper p-8 text-ink">
      <section className="mx-auto max-w-5xl rounded-2xl border-4 border-ink bg-white p-6 shadow-brutal">
        <p className="font-black uppercase tracking-[.25em] text-stallRed">
          Advertiser Portal
        </p>
        <h1 className="font-display text-6xl uppercase">Published Ads</h1>
        <p className="mt-2 font-bold">
          Published ads and campaigns created by {advertiser.name}.
        </p>
        <Link
          href="/portal/advertiser"
          className="mt-4 inline-flex font-black uppercase text-stallPurple underline"
        >
          Back to Advertiser Portal
        </Link>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {campaigns.map((campaign) => (
            <article
              key={campaign.id}
              className="rounded-xl border-2 border-ink bg-paper p-4"
            >
              <p className="text-xs font-black uppercase text-stallRed">
                {campaign.publishStatus} • Slot{" "}
                {campaign.slotPublished || campaign.selectedSlot || "—"}
              </p>
              <h2 className="font-display text-4xl uppercase">
                {campaign.business}
              </h2>
              <p className="font-black">
                {campaign.headline || campaign.ad?.title}
              </p>
              <p>{campaign.subheadline || campaign.ad?.offer}</p>
            </article>
          ))}
          {standaloneAds.map((ad) => (
            <article
              key={ad.id}
              className="rounded-xl border-2 border-ink bg-paper p-4"
            >
              <p className="text-xs font-black uppercase text-stallRed">
                {ad.status} • {ad.scope}
              </p>
              <h2 className="font-display text-4xl uppercase">
                {ad.businessName}
              </h2>
              <p className="font-black">{ad.title}</p>
              <p>{ad.offer}</p>
            </article>
          ))}
          {!campaigns.length && !standaloneAds.length ? (
            <p className="rounded-xl border-2 border-ink bg-stallYellow p-4 font-black uppercase md:col-span-2">
              No published ads yet.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
