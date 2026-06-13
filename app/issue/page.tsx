import IssueByVenuePage from "./[venueSlug]/page";
import { prisma } from "@/lib/prisma";
import publishedIssue from "@/data/published-issue.json";
import publishedAds from "@/data/published-ads.json";
import { MissionCard, PublicationHeader } from "@/components/PublicationIssueChrome";

export const dynamic = "force-dynamic";

type IssueSearchParams = { venue?: string; qr?: string };
type StaticAd = (typeof publishedAds)[number];

export default async function IssueQueryPage({ searchParams }: { searchParams: Promise<IssueSearchParams> }) {
  const { venue, qr } = await searchParams;

  try {
    if (venue) {
      const match = await prisma.venue.findFirst({ where: { slug: venue, isActive: true }, select: { slug: true } });
      if (match) return <IssueByVenuePage params={Promise.resolve({ venueSlug: match.slug })} searchParams={Promise.resolve({ qr })} />;
    }

    const latestPublishedIssue = await prisma.issue.findFirst({
      where: { status: "PUBLISHED" },
      orderBy: [{ year: "desc" }, { issueNumber: "desc" }],
      include: { venue: true }
    });

    if (latestPublishedIssue?.venue?.slug) {
      return <IssueByVenuePage params={Promise.resolve({ venueSlug: latestPublishedIssue.venue.slug })} searchParams={Promise.resolve({ qr })} />;
    }
  } catch (error) {
    console.error("Public issue database load failed; rendering static June 2026 fallback issue.", error);
  }

  return <StaticIssuePage />;
}

function StaticIssuePage() {
  return (
    <main className="public-page">
      <article className="publication" aria-label="Potty Favor monthly issue">
        <PublicationHeader monthYear={publishedIssue.issueMonthYear} />
        <section className="print-grid">
          <MissionCard missionText={publishedIssue.missionText} />
          {publishedAds.slice(0, 8).map((ad, index) => <StaticPublicationAd key={`${ad.slot}-${ad.advertiserName}`} ad={ad} slotNumber={index + 1} primary={index === 0} />)}
        </section>
      </article>
    </main>
  );
}

function StaticPublicationAd({ ad, slotNumber, primary = false }: { ad: StaticAd; slotNumber: number; primary?: boolean }) {
  return (
    <article className={`ad-card inline-ad ${primary ? "inline-ad-primary" : ""}`} id={`sponsor-slot-${slotNumber}`}>
      <span className="slot">Ad {slotNumber}</span>
      {ad.image ? <img src={ad.image} alt={`${ad.advertiserName} advertisement`} /> : null}
      <h3>{ad.advertiserName}</h3>
      <div className="ad-copy">
        <p>{ad.headline}</p>
        <p>{ad.offer}</p>
      </div>
      <div className="ad-actions">
        <a href={ad.targetUrl || "#"}>{ad.cta || "Learn More"}</a>
        {ad.couponCode ? <span className="coupon">{ad.couponCode}</span> : null}
      </div>
    </article>
  );
}
