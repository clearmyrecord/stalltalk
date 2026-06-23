import IssueByVenuePage from "./[venueSlug]/page";
import {
  MissionCard,
  PublicationFooter,
  PublicationHeader,
} from "@/components/PublicationIssueChrome";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServedAds } from "@/lib/ad-serving";
import publishedIssue from "@/data/published-issue.json";
import publishedAds from "@/data/published-ads.json";
import {
  getPublicationAds,
  PublicationAdFallback,
  StaticPublicationBlocks,
  type PublicationAdLike,
} from "@/components/StaticPublicationBlocks";
import { DEFAULT_PUBLIC_ISSUE_ID } from "@/lib/default-public-issue";
import { getDefaultGlobalIssue } from "@/lib/default-global-issue";
import { headers } from "next/headers";
import { recordAdImpression, recordQrScan } from "@/lib/tracking";

export const dynamic = "force-dynamic";

type IssueSearchParams = {
  venue?: string;
  qr?: string;
  previewIssueId?: string;
};
type IssueWithAds = Prisma.IssueGetPayload<{
  include: {
    venue: true;
    restroom: true;
    adSlots: { include: { ad: { include: { campaignHistory: true } } } };
    contentBlocks: { include: { article: true } };
  };
}>;

export default async function IssueQueryPage({
  searchParams,
}: {
  searchParams: Promise<IssueSearchParams>;
}) {
  const { venue, qr, previewIssueId } = await searchParams;
  const request = await requestFromHeaders(`/issue${qr ? `?qr=${encodeURIComponent(qr)}` : ""}`);

  if (qr) {
    try {
      await recordQrScan({ code: qr, request, source: "issue-query" });
    } catch (error) {
      console.error("Issue query QR scan analytics failed", error);
    }
  }

  try {
    if (previewIssueId) {
      const previewIssue = await prisma.issue.findUnique({
        where: { id: previewIssueId },
        include: { venue: true },
      });
      const previewVenueSlug =
        previewIssue?.venue?.slug ||
        (
          await prisma.venue.findFirst({
            where: { isActive: true },
            select: { slug: true },
          })
        )?.slug;

      if (previewVenueSlug) {
        return (
          <IssueByVenuePage
            params={Promise.resolve({ venueSlug: previewVenueSlug })}
            searchParams={Promise.resolve({ qr, previewIssueId })}
          />
        );
      }
    }

    if (qr) {
      const qrRecord = await prisma.qrCode.findUnique({
        where: { qrSlug: qr },
        include: { venue: true },
      });
      if (qrRecord?.venue?.slug) {
        return (
          <IssueByVenuePage
            params={Promise.resolve({ venueSlug: qrRecord.venue.slug })}
            searchParams={Promise.resolve({ qr })}
          />
        );
      }
    }

    if (venue) {
      const match = await prisma.venue.findFirst({
        where: { slug: venue, isActive: true },
        select: { slug: true },
      });

      if (match) {
        return (
          <IssueByVenuePage
            params={Promise.resolve({ venueSlug: match.slug })}
            searchParams={Promise.resolve({ qr })}
          />
        );
      }
    }

    const defaultGlobalIssue = await getDefaultGlobalIssue({ createIfMissing: true });
    if (defaultGlobalIssue?.status === "PUBLISHED") {
      return <DatabaseIssuePage issue={defaultGlobalIssue as IssueWithAds} qrCode={qr} request={request} />;
    }

    const hasDefaultPublicAds = await prisma.stalltalkCampaignHistory.findFirst(
      {
        where: {
          targetType: DEFAULT_PUBLIC_ISSUE_ID,
          publishStatus: "PUBLISHED",
          ad: { status: "ACTIVE" },
        },
        select: { id: true },
      },
    );
    if (hasDefaultPublicAds) {
      return <StaticIssuePage qrCode={qr} request={request} />;
    }

    const latestPublishedIssue = await prisma.issue.findFirst({
      where: { status: "PUBLISHED", isArchived: false },
      orderBy: [{ year: "desc" }, { issueNumber: "desc" }],
      include: {
        venue: true,
        restroom: true,
        adSlots: {
          include: { ad: { include: { campaignHistory: true } } },
          orderBy: { slotNumber: "asc" },
        },
        contentBlocks: {
          include: { article: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (latestPublishedIssue?.venue?.slug) {
      return (
        <IssueByVenuePage
          params={Promise.resolve({
            venueSlug: latestPublishedIssue.venue.slug,
          })}
          searchParams={Promise.resolve({ qr })}
        />
      );
    }

    if (latestPublishedIssue) {
      return <DatabaseIssuePage issue={latestPublishedIssue as IssueWithAds} qrCode={qr} request={request} />;
    }
  } catch (error) {
    console.error(
      "Public issue database load failed; rendering static June 2026 fallback issue.",
      error,
    );
  }

  return <StaticIssuePage qrCode={qr} request={request} />;
}

async function requestFromHeaders(path: string) {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  return new Request(`${proto}://${host}${path}`, { headers: h });
}

async function StaticIssuePage({ qrCode, request }: { qrCode?: string; request: Request }) {
  const defaultCampaigns = await prisma.stalltalkCampaignHistory
    .findMany({
      where: {
        targetType: DEFAULT_PUBLIC_ISSUE_ID,
        publishStatus: "PUBLISHED",
        ad: { status: "ACTIVE" },
      },
      include: { ad: true },
      orderBy: [{ slotPublished: "asc" }, { publishedAt: "desc" }],
    })
    .catch((error) => {
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
  await Promise.all(ads.map((ad, index) => recordAdImpression({ adId: ad.id, campaignId: (ad as any).campaignId, slotNumber: index + 1, qrCode, issueId: DEFAULT_PUBLIC_ISSUE_ID, request }).catch((error) => console.error("Ad impression analytics failed", error))));

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

async function DatabaseIssuePage({ issue, qrCode, request }: { issue: IssueWithAds; qrCode?: string; request: Request }) {
  const ads = await getServedAds(issue);
  const publicationAds = getPublicationAds(
    ads.map((ad) =>
      ad
        ? ({
            ...ad,
            imageUrl:
              ad.artworkUrl ||
              (ad as any).creativeUrl ||
              (ad as any).campaignHistory?.[0]?.image ||
              undefined,
            campaignImage: (ad as any).campaignHistory?.[0]?.image || undefined,
          } as PublicationAdLike)
        : undefined,
    ),
  );
  await Promise.all(publicationAds.map((ad, index) => recordAdImpression({ adId: ad.id, campaignId: (ad as any).campaignId, slotNumber: index + 1, qrCode, venueId: issue.venueId, issueId: issue.id, request }).catch((error) => console.error("Ad impression analytics failed", error))));
  const articleBlocks = issue.contentBlocks.filter(
    (block) =>
      block.type === "ARTICLE" &&
      (!block.article || block.article.status === "PUBLISHED"),
  );
  const byKey = (key: string) => issue.contentBlocks.find((block) => (block.layout as any)?.key === key);
  const [mainFeature, secondaryFeature] = articleBlocks;

  return (
    <main className="public-page">
      <article className="publication" aria-label="Potty Favor monthly issue">
        <PublicationHeader monthYear={`${issue.month} ${issue.year}`} />
        <section className="print-grid">
          <MissionCard missionText={byKey("mission")?.body || publishedIssue.missionText} />
          <PublicationAdFallback
            ad={publicationAds[0]}
            slotNumber={1}
            qrCode={qrCode}
            primary
          />
          <StaticPublicationBlocks
            ads={publicationAds}
            qrCode={qrCode}
            blocks={issue.contentBlocks.map((block) => ({ title: block.title, body: block.body, imageUrl: block.imageUrl, layout: block.layout as any }))}
            mainFeature={
              mainFeature
                ? { title: mainFeature.title, body: mainFeature.body }
                : undefined
            }
            secondaryFeature={
              secondaryFeature
                ? { title: secondaryFeature.title, body: secondaryFeature.body }
                : undefined
            }
          />
        </section>
        <PublicationFooter />
      </article>
    </main>
  );
}
