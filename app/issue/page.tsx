import Link from "next/link";
import IssueByVenuePage from "./[venueSlug]/page";
import { prisma } from "@/lib/prisma";
import publishedIssue from "@/data/published-issue.json";
import publishedAds from "@/data/published-ads.json";

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

  return <StaticJuneIssue />;
}

function StaticJuneIssue() {
  const adsBySlot = Array.from({ length: 8 }, (_, index) => publishedAds.find((ad) => ad.slot === index + 1 && ad.active));

  return (
    <main className="issue-shell min-h-screen overflow-x-hidden text-ink">
      <header className="sticky top-0 z-40 border-b-4 border-ink bg-stallYellow px-3 py-2 text-center shadow-lg md:relative md:top-auto md:z-auto md:px-8">
        <p className="text-xs font-black uppercase tracking-[.25em]">Stall Talk • Public Fallback Edition • Venue-wide</p>
        <h1 className="font-display text-5xl uppercase leading-none md:text-7xl">{publishedIssue.mastheadBrand}</h1>
        <p className="font-black uppercase">Las Vegas, NV • {publishedIssue.issueMonthYear} • Public Issue</p>
      </header>

      <div className="mx-auto max-w-5xl p-3 pb-20 md:p-5">
        <section className="grid min-w-0 gap-5">
          <div className="rounded-[2rem] border-4 border-ink bg-white p-5 shadow-brutal">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[.3em] text-stallPurple">Publisher-grade restroom media</p>
                <h2 className="font-display text-6xl uppercase leading-none text-stallRed md:text-8xl">Potty Favor</h2>
                <p className="mt-2 text-xl font-black uppercase">{publishedIssue.missionText}</p>
              </div>
              <Link href="/signin" className="rounded-xl border-4 border-ink bg-stallYellow px-4 py-3 text-sm font-black uppercase shadow-brutal">
                Admin Sign In
              </Link>
            </div>
          </div>

          <AdPlacement ad={adsBySlot[0]} slotNumber={1} />
          <StaticArticle eyebrow="Main Feature" title={publishedIssue.mainFeatureTitle} body={publishedIssue.mainFeatureBody} open />
          <AdPlacement ad={adsBySlot[1]} slotNumber={2} />
          <StaticArticle eyebrow="Feature Story" title={publishedIssue.secondaryFeatureTitle} body={publishedIssue.secondaryFeatureBody} open />
          <AdPlacement ad={adsBySlot[2]} slotNumber={3} />
          <StaticArticle eyebrow="Hilariously Funny" title={publishedIssue.humorTitle} body={publishedIssue.humorBody} />
          <AdPlacement ad={adsBySlot[3]} slotNumber={4} />

          <section className="grid gap-4 md:grid-cols-2">
            <InfoCard title="Word of the Day" items={[`${publishedIssue.wordOfTheDay}: ${publishedIssue.wordDefinition}`]} />
            <InfoCard title="Quotes" items={publishedIssue.quotes} />
            <InfoCard title="Did You Know?" items={publishedIssue.didYouKnow} />
            <InfoCard title="No Way" items={publishedIssue.noWay} />
          </section>

          <AdPlacement ad={adsBySlot[4]} slotNumber={5} />
          <section className="rounded-[1.5rem] border-4 border-ink bg-stallYellow p-4 shadow-brutal">
            <p className="text-xs font-black uppercase tracking-[.3em] text-stallPurple">Calendar / Community</p>
            <h3 className="mt-2 font-display text-5xl uppercase leading-none md:text-6xl">Local Happenings</h3>
            <p className="mt-3 text-lg font-bold leading-relaxed">{publishedIssue.calendarText}</p>
          </section>
          {[6, 7, 8].map((slotNumber) => <AdPlacement key={slotNumber} ad={adsBySlot[slotNumber - 1]} slotNumber={slotNumber} />)}

          <section className="rounded-[1.5rem] border-4 border-ink bg-white p-5 text-center shadow-brutal">
            <p className="text-xs font-black uppercase tracking-[.3em] text-stallPurple">Sponsor Directory</p>
            <h2 className="font-display text-5xl uppercase text-stallRed">Featured Potty Favor Sponsors</h2>
            <p className="mt-2 font-black uppercase">Eight inline publication ad slots support venue and global content while the database issue is unavailable.</p>
          </section>
        </section>
      </div>
    </main>
  );
}

function StaticArticle({ eyebrow, title, body, open = false }: { eyebrow: string; title: string; body: string; open?: boolean }) {
  return (
    <details className="group rounded-[1.5rem] border-4 border-ink bg-paper p-4 shadow-brutal open:bg-white" open={open}>
      <summary className="cursor-pointer list-none">
        <span className="rounded-full bg-ink px-3 py-1 text-xs font-black uppercase tracking-widest text-stallYellow">{eyebrow}</span>
        <h3 className="mt-3 font-display text-5xl uppercase leading-none md:text-6xl">{title}</h3>
        <p className="mt-2 font-black uppercase text-stallPurple">Tap to {open ? "collapse" : "expand"}</p>
      </summary>
      <p className="mt-4 whitespace-pre-wrap text-lg font-bold leading-relaxed">{body}</p>
    </details>
  );
}

function InfoCard({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-[1.5rem] border-4 border-ink bg-white p-4 shadow-brutal">
      <h3 className="font-display text-4xl uppercase text-stallRed">{title}</h3>
      <ul className="mt-3 grid gap-2 font-bold">
        {items.map((item) => <li key={item} className="rounded-xl bg-paper p-3">{item}</li>)}
      </ul>
    </section>
  );
}

function AdPlacement({ ad, slotNumber }: { ad?: StaticAd; slotNumber: number }) {
  return (
    <article id={`sponsor-slot-${slotNumber}`} className="overflow-hidden rounded-[1.5rem] border-4 border-ink bg-white shadow-brutal">
      <div className={`ad-gradient-${slotNumber} p-5 text-white`}>
        <p className="text-xs font-black uppercase tracking-[.3em]">Sponsor Slot {slotNumber}</p>
        <h3 className="mt-2 font-display text-5xl uppercase leading-none">{ad?.advertiserName || "Available Sponsor"}</h3>
      </div>
      <div className="grid gap-3 p-5 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-2xl font-black uppercase text-stallRed">{ad?.headline || "Advertise With Us"}</p>
          <p className="mt-1 text-lg font-bold">{ad?.offer || "Reach Potty Favor readers with public sponsor inventory."}</p>
          {ad?.couponCode ? <p className="mt-3 inline-flex rounded-full bg-stallYellow px-3 py-1 text-sm font-black uppercase">Code: {ad.couponCode}</p> : null}
        </div>
        <a href={ad?.targetUrl || "/signin"} className="rounded-xl border-4 border-ink bg-stallPurple px-5 py-3 text-center font-black uppercase text-white shadow-brutal">
          {ad?.cta || "Book Slot"}
        </a>
      </div>
    </article>
  );
}
