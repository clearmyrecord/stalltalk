import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import publishedIssue from "@/data/published-issue.json";
import publishedAds from "@/data/published-ads.json";
import { MissionCard, PublicationFooter, PublicationHeader } from "@/components/PublicationIssueChrome";
import { getPublicationAds, PublicationAdFallback, StaticPublicationBlocks, type PublicationAdLike } from "@/components/StaticPublicationBlocks";
import { DEFAULT_PUBLIC_ISSUE_ID } from "@/lib/default-public-issue";
import { recordAdImpression } from "@/lib/tracking";
import { PUBLIC_ANALYTICS_TIMEOUT_MS, withPublicTimeout } from "@/lib/public-route-timeouts";

export async function requestFromHeaders(path: string) {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  return new Request(`${proto}://${host}${path}`, { headers: h });
}

export async function StaticIssuePage({ qrCode, request }: { qrCode?: string; request: Request }) {
  const defaultCampaigns = await withPublicTimeout(
    prisma.stalltalkCampaignHistory.findMany({
      where: {
        targetType: DEFAULT_PUBLIC_ISSUE_ID,
        publishStatus: "PUBLISHED",
        ad: { status: "ACTIVE" },
      },
      include: { ad: true },
      orderBy: [{ slotPublished: "asc" }, { publishedAt: "desc" }],
    }),
    "default public ads lookup",
  ).catch((error) => {
      console.error(
        "Default public issue published ad load failed; using static ad JSON fallback.",
        error,
      );
      return [];
    });
  const dbAds = defaultCampaigns.reduce<PublicationAdLike[]>(
    (items, campaign) => {
      if (!campaign.slotPublished || !campaign.ad) return items;
      items[campaign.slotPublished - 1] = {
        id: campaign.ad.id,
        campaignId: campaign.campaignId,
        businessName: campaign.ad.businessName || campaign.business,
        title: campaign.ad.title || campaign.headline || undefined,
        offer: campaign.ad.offer || campaign.subheadline || undefined,
        generatedHeadline:
          campaign.ad.generatedHeadline || campaign.headline || undefined,
        generatedSubheadline:
          campaign.ad.generatedSubheadline || campaign.subheadline || undefined,
        ctaText: campaign.ad.ctaText || campaign.ctaText || undefined,
        targetUrl: campaign.ad.targetUrl || campaign.targetUrl || undefined,
        couponCode: campaign.ad.couponCode || campaign.couponCode || undefined,
        artworkUrl: campaign.ad.artworkUrl || undefined,
        creativeUrl: campaign.ad.artworkUrl || undefined,
        campaignImage: campaign.image || undefined,
        imageUrl: campaign.ad.artworkUrl || campaign.image || undefined,
      };
      return items;
    },
    [],
  );
  const ads = getPublicationAds(
    dbAds.length ? dbAds : publishedAds.filter((ad) => ad.active !== false),
  );
  await withPublicTimeout(
    Promise.all(ads.map((ad, index) => recordAdImpression({ adId: ad.id, campaignId: (ad as any).campaignId, slotNumber: index + 1, qrCode, issueId: DEFAULT_PUBLIC_ISSUE_ID, request }).catch((error) => console.error("Ad impression analytics failed", error)))),
    "static issue impression analytics",
    PUBLIC_ANALYTICS_TIMEOUT_MS,
  ).catch((error) => console.error("Ad impression analytics timed out", error));

  return (
    <main className="public-page">
      <article
        className="publication"
        aria-label="Potty Favor monthly issue"
        data-issue-id={DEFAULT_PUBLIC_ISSUE_ID}
      >
        <PublicationHeader monthYear={publishedIssue.issueMonthYear} />
        <section className="print-grid">
          <MissionCard missionText={publishedIssue.missionText} />
          <PublicationAdFallback ad={ads[0]} slotNumber={1} qrCode={qrCode} primary />
          <StaticPublicationBlocks ads={ads} qrCode={qrCode} />
        </section>
        <PublicationFooter />
      </article>
    </main>
  );
}

