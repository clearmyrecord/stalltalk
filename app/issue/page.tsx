import IssueByVenuePage from "./[venueSlug]/page";
import { MissionCard, PublicationFooter, PublicationHeader } from "@/components/PublicationIssueChrome";
import { prisma } from "@/lib/prisma";
import publishedIssue from "@/data/published-issue.json";
import publishedAds from "@/data/published-ads.json";
import { PublicationAdFallback, StaticPublicationBlocks } from "@/components/StaticPublicationBlocks";

export const dynamic = "force-dynamic";

type IssueSearchParams = { venue?: string; qr?: string };

export default async function IssueQueryPage({
  searchParams
}: {
  searchParams: Promise<IssueSearchParams>;
}) {
  const { venue, qr } = await searchParams;

  try {
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
      include: { venue: true }
    });

    if (latestPublishedIssue?.venue?.slug) {
      return (
        <IssueByVenuePage
          params={Promise.resolve({ venueSlug: latestPublishedIssue.venue.slug })}
          searchParams={Promise.resolve({ qr })}
        />
      );
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
  const ads = publishedAds
    .filter((ad) => ad.active !== false)
    .slice(0, 8);

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
