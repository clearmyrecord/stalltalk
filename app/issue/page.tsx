import Link from "next/link";
import IssueByVenuePage from "./[venueSlug]/page";
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
    <main className="min-h-screen bg-paper px-4 py-8 text-ink md:px-8">
      <section className="mx-auto max-w-5xl rounded-[2rem] border-4 border-ink bg-white p-6 shadow-brutal">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-stallRed">
          {publishedIssue.issueMonthYear}
        </p>

        <h1 className="mt-2 font-display text-7xl uppercase leading-none md:text-9xl">
          {publishedIssue.mastheadBrand}
        </h1>

        <p className="mt-4 max-w-xl text-xl font-bold">
          {publishedIssue.missionText}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            className="rounded-xl bg-stallYellow px-4 py-3 font-black uppercase"
            href="/signin"
          >
            Admin Sign In
          </Link>
        </div>
      </section>

      <section className="mx-auto mt-8 grid max-w-5xl gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-6">
          <StaticArticle
            title={publishedIssue.mainFeatureTitle}
            body={publishedIssue.mainFeatureBody}
          />

          <StaticArticle
            title={publishedIssue.secondaryFeatureTitle}
            body={publishedIssue.secondaryFeatureBody}
          />

          <StaticArticle
            title={publishedIssue.humorTitle}
            body={publishedIssue.humorBody}
          />
        </div>

        <aside className="grid content-start gap-4">
          {ads.map((ad) => (
            <a
              key={ad.slot}
              className="rounded-2xl border-4 border-ink bg-white p-4 shadow-brutal"
              href={ad.targetUrl || "#"}
            >
              <p className="text-xs font-black uppercase tracking-widest text-stallPurple">
                Sponsor #{ad.slot}
              </p>

              <h2 className="mt-2 font-display text-4xl uppercase leading-none">
                {ad.headline}
              </h2>

              <p className="mt-2 font-bold">{ad.offer}</p>

              {ad.couponCode ? (
                <p className="mt-3 inline-block rounded-lg bg-stallYellow px-3 py-2 font-black uppercase">
                  {ad.couponCode}
                </p>
              ) : null}

              <p className="mt-3 font-black uppercase text-stallRed">
                {ad.cta}
              </p>
            </a>
          ))}
        </aside>
      </section>
    </main>
  );
}

function StaticArticle({
  title,
  body
}: {
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-[2rem] border-4 border-ink bg-white p-6 shadow-brutal">
      <h2 className="font-display text-5xl uppercase leading-none md:text-7xl">
        {title}
      </h2>

      <div className="mt-4 space-y-4 text-lg font-bold leading-relaxed">
        {body.split("\n\n").map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </article>
  );
}