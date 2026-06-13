import IssueByVenuePage from "./[venueSlug]/page";
import { MissionCard, PublicationFooter, PublicationHeader } from "@/components/PublicationIssueChrome";
import { prisma } from "@/lib/prisma";
import publishedIssue from "@/data/published-issue.json";
import publishedAds from "@/data/published-ads.json";

export const dynamic = "force-dynamic";

type IssueSearchParams = { venue?: string; qr?: string };
type StaticAd = (typeof publishedAds)[number];

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
  const ads = (publishedAds as StaticAd[])
    .filter((ad) => ad.active !== false)
    .slice(0, 8);

  return (
    <main className="public-page">
      <article className="publication" aria-label="Potty Favor monthly issue">
        <PublicationHeader monthYear={publishedIssue.issueMonthYear} />
        <section className="print-grid">
          <MissionCard missionText={publishedIssue.missionText} />
          <PublicationAdFallback ad={ads[0]} slotNumber={1} primary />
          <StaticArticle title={publishedIssue.humorTitle} body={publishedIssue.humorBody} variant="secondary-card" />
          <PublicationAdFallback ad={ads[1]} slotNumber={2} />
          <StaticArticle title={publishedIssue.mainFeatureTitle} body={publishedIssue.mainFeatureBody} variant="feature-card" />
          <PublicationAdFallback ad={ads[2]} slotNumber={3} />
          <StaticArticle title={publishedIssue.secondaryFeatureTitle} body={publishedIssue.secondaryFeatureBody} variant="secondary-card" />
          {ads.slice(3, 8).map((ad, index) => (
            <PublicationAdFallback key={ad.slot} ad={ad} slotNumber={index + 4} />
          ))}
          <section className="sponsor-directory panel">
            <p className="directory-kicker">Sponsor Directory</p>
            <h2>Featured Potty Favor Sponsors</h2>
            <p>Every ad above is served by venue, city, state, or global targeting so local offers can travel with the publication without leaving the reading flow.</p>
          </section>
        </section>
        <PublicationFooter />
      </article>
    </main>
  );
}

function PublicationAdFallback({ ad, slotNumber, primary = false }: { ad?: StaticAd; slotNumber: number; primary?: boolean }) {
  return (
    <article className={`ad-card inline-ad ${primary ? "inline-ad-primary" : ""} ${ad ? "" : "is-empty"}`} id={`sponsor-slot-${slotNumber}`}>
      <span className="slot">Ad {slotNumber}</span>
      <h3>{ad?.headline || "Available Sponsor Slot"}</h3>
      <div className="ad-copy">
        <p>{ad?.offer || "Advertise Here"}</p>
        <p>{ad?.cta || "Reach restroom readers in this venue."}</p>
      </div>
      <div className="ad-actions">
        <a href={ad?.targetUrl || "/signin"}>{ad?.cta || "Book Slot"}</a>
        {ad?.couponCode ? <span className="coupon">{ad.couponCode}</span> : null}
      </div>
    </article>
  );
}

function StaticArticle({ title, body, variant }: { title: string; body: string; variant: "feature-card" | "secondary-card" }) {
  return (
    <section className={`panel ${variant}`}>
      <h2>{title}</h2>
      <div className="article-copy">
        {body.split("\n\n").map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}
