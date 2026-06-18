import IssueByVenuePage from "./[venueSlug]/page";
import { MissionCard, PublicationFooter, PublicationHeader } from "@/components/PublicationIssueChrome";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServedAds } from "@/lib/ad-serving";
import publishedIssue from "@/data/published-issue.json";
import publishedAds from "@/data/published-ads.json";
import { getPublicationAds, PublicationAdFallback, StaticPublicationBlocks, type PublicationAdLike } from "@/components/StaticPublicationBlocks";

export const dynamic = "force-dynamic";

type IssueSearchParams = { venue?: string; qr?: string; previewIssueId?: string };
type IssueWithAds = Prisma.IssueGetPayload<{ include: { venue: true; restroom: true; adSlots: { include: { ad: { include: { campaignHistory: true } } } }; contentBlocks: { include: { article: true } } } }>;

export default async function IssueQueryPage({
  searchParams
}: {
  searchParams: Promise<IssueSearchParams>;
}) {
  const { venue, qr, previewIssueId } = await searchParams;

  try {
    if (previewIssueId) {
      const previewIssue = await prisma.issue.findUnique({
        where: { id: previewIssueId },
        include: { venue: true }
      });
      const previewVenueSlug = previewIssue?.venue?.slug || (await prisma.venue.findFirst({ where: { isActive: true }, select: { slug: true } }))?.slug;

      if (previewVenueSlug) {
        return (
          <IssueByVenuePage
            params={Promise.resolve({ venueSlug: previewVenueSlug })}
            searchParams={Promise.resolve({ qr, previewIssueId })}
          />
        );
      }
    }

    if (venue) {
      const match = await prisma.venue.findFirst({
        where: { slug: venue, isActive: true },
        select: { slug: true }
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

    const latestPublishedIssue = await prisma.issue.findFirst({
      where: { status: "PUBLISHED" },
      orderBy: [{ year: "desc" }, { issueNumber: "desc" }],
      include: { venue: true, restroom: true, adSlots: { include: { ad: { include: { campaignHistory: true } } }, orderBy: { slotNumber: "asc" } }, contentBlocks: { include: { article: true }, orderBy: { sortOrder: "asc" } } }
    });

    if (latestPublishedIssue?.venue?.slug) {
      return (
        <IssueByVenuePage
          params={Promise.resolve({ venueSlug: latestPublishedIssue.venue.slug })}
          searchParams={Promise.resolve({ qr })}
        />
      );
    }

    if (latestPublishedIssue) {
      return <DatabaseIssuePage issue={latestPublishedIssue as IssueWithAds} />;
    }
  } catch (error) {
    console.error(
      "Public issue database load failed; rendering static June 2026 fallback issue.",
      error
    );
  }

  return <StaticIssuePage />;
}

function StaticIssuePage() {
  const ads = getPublicationAds(publishedAds.filter((ad) => ad.active !== false));

  return (
    <main className="public-page">
      <article className="publication" aria-label="Potty Favor monthly issue">
        <PublicationHeader monthYear={publishedIssue.issueMonthYear} />
        <section className="print-grid">
          <MissionCard missionText={publishedIssue.missionText} />
          <PublicationAdFallback ad={ads[0]} slotNumber={1} primary />
          <StaticPublicationBlocks ads={ads} />
        </section>
        <PublicationFooter />
      </article>
    </main>
  );
}


async function DatabaseIssuePage({ issue }: { issue: IssueWithAds }) {
  const ads = await getServedAds(issue);
  const publicationAds = getPublicationAds(ads.map((ad) => ad || undefined) as PublicationAdLike[]);
  const articleBlocks = issue.contentBlocks.filter((block) => block.type === "ARTICLE" && (!block.article || block.article.status === "PUBLISHED"));
  const [mainFeature, secondaryFeature] = articleBlocks;

  return (
    <main className="public-page">
      <article className="publication" aria-label="Potty Favor monthly issue">
        <PublicationHeader monthYear={`${issue.month} ${issue.year}`} />
        <section className="print-grid">
          <MissionCard missionText={publishedIssue.missionText} />
          <PublicationAdFallback ad={publicationAds[0]} slotNumber={1} primary />
          <StaticPublicationBlocks ads={publicationAds} mainFeature={mainFeature ? { title: mainFeature.title, body: mainFeature.body } : undefined} secondaryFeature={secondaryFeature ? { title: secondaryFeature.title, body: secondaryFeature.body } : undefined} />
        </section>
        <PublicationFooter />
      </article>
    </main>
  );
}
