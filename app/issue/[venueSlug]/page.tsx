import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { ImpressionRecorder } from "@/components/ImpressionRecorder";
import { ScanRecorder } from "@/components/ScanRecorder";
import { RestaurantReviewCard } from "@/components/RestaurantReviewCard";
import { getServedAds } from "@/lib/ad-serving";
import { prisma } from "@/lib/prisma";
import { MissionCard, PublicationHeader } from "@/components/PublicationIssueChrome";

export const dynamic = "force-dynamic";
type IssueWithContext = Prisma.IssueGetPayload<{ include: { publisher: true; venue: true; restroom: true; qrCode: true; contentBlocks: { include: { article: true } }; adSlots: { include: { ad: true } } } }>;
type ServedAds = Awaited<ReturnType<typeof getServedAds>>;
type RestaurantReviewItem = Prisma.RestaurantReviewGetPayload<{}>;

export default async function IssuePage({ params, searchParams }: { params: Promise<{ venueSlug: string }>; searchParams: Promise<{ qr?: string }> }) {
  const { venueSlug } = await params;
  const { qr } = await searchParams;
  const requestedVenue = await prisma.venue.findFirst({ where: { slug: venueSlug, isActive: true } });
  if (!requestedVenue) notFound();

  const directIssue = await prisma.issue.findFirst({
    where: { venueId: requestedVenue.id, status: "PUBLISHED", ...(qr ? { qrCode: { qrSlug: qr } } : {}) },
    orderBy: [{ year: "desc" }, { issueNumber: "desc" }],
    include: { publisher: true, venue: true, restroom: true, qrCode: true, contentBlocks: { include: { article: true }, orderBy: { sortOrder: "asc" } }, adSlots: { include: { ad: true }, orderBy: { slotNumber: "asc" } } }
  });
  const issue = directIssue || await prisma.issue.findFirst({
    where: { status: "PUBLISHED", OR: [{ venueId: null }, { venueId: requestedVenue.id }] },
    orderBy: [{ year: "desc" }, { issueNumber: "desc" }],
    include: { publisher: true, venue: true, restroom: true, qrCode: true, contentBlocks: { include: { article: true }, orderBy: { sortOrder: "asc" } }, adSlots: { include: { ad: true }, orderBy: { slotNumber: "asc" } } }
  });
  if (!issue) notFound();
  const renderIssue = issue as IssueWithContext & { venue: NonNullable<IssueWithContext["venue"]> };
  renderIssue.venue = requestedVenue;
  renderIssue.venueId = requestedVenue.id;
  renderIssue.restroomId = directIssue?.restroomId || null;
  renderIssue.qrCodeId = directIssue?.qrCodeId || null;
  renderIssue.contentBlocks = issue.contentBlocks.filter((block) => (!block.article || block.article.status === "PUBLISHED") && (!block.venueIds.length || block.venueIds.includes(requestedVenue.id)));
  const approvedVenueDrafts = await prisma.venueContentDraft.findMany({ where: { venueId: requestedVenue.id, approvalStatus: "APPROVED" }, orderBy: { approvedAt: "desc" }, take: 3 });
  const now = new Date();
  const restaurantReviews = await prisma.restaurantReview.findMany({
    where: {
      publisherId: renderIssue.publisherId,
      status: "PUBLISHED",
      AND: [
        { OR: [{ publishDate: null }, { publishDate: { lte: now } }] },
        { OR: [{ venueId: requestedVenue.id }, { venueIds: { has: requestedVenue.id } }, { venueId: null, venueIds: { isEmpty: true } }] }
      ]
    },
    orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }]
  });
  const sortedReviews = restaurantReviews.sort((a, b) => reviewPriority(b, requestedVenue.id) - reviewPriority(a, requestedVenue.id));
  const ads = await getServedAds(renderIssue);
  const actualAds = ads.filter((ad): ad is NonNullable<typeof ad> => Boolean(ad));

  const monthYear = `${renderIssue.month} ${renderIssue.year}`;
  const venueLine = `${renderIssue.venue.name} Edition`;

  return (
    <main className="public-page">
      <ScanRecorder publisherId={renderIssue.publisherId} venueId={renderIssue.venueId} restroomId={renderIssue.restroomId} qrCodeId={renderIssue.qrCodeId} issueId={renderIssue.id} />
      <ImpressionRecorder events={actualAds.map((ad) => ({ publisherId: renderIssue.publisherId, venueId: renderIssue.venueId, restroomId: renderIssue.restroomId, qrCodeId: renderIssue.qrCodeId, issueId: renderIssue.id, advertiserId: ad.advertiserId, adId: ad.id, slotNumber: ad.slotNumber }))} />
      <article className="publication" aria-label="Potty Favor monthly issue">
        <PublicationHeader monthYear={monthYear} venueLine={venueLine} />
        <IssueContent issue={renderIssue} ads={ads} venueDrafts={approvedVenueDrafts} restaurantReviews={sortedReviews} />
      </article>
      <nav className="mobile-sponsor-nav" aria-label="Sponsor slots">
        <div>{Array.from({ length: 8 }, (_, index) => <a key={index} href={`#sponsor-slot-${index + 1}`}>{index + 1}</a>)}</div>
      </nav>
    </main>
  );
}

function AdPlacement({ ads, slotNumber }: { ads: ServedAds; slotNumber: number }) {
  const ad = ads[slotNumber - 1];
  if (!ad) return <PublicationAd slotNumber={slotNumber} />;
  return <PublicationAd ad={ad} slotNumber={slotNumber} />;
}

function PublicationAd({ ad, slotNumber, primary = false }: { ad?: NonNullable<ServedAds[number]>; slotNumber: number; primary?: boolean }) {
  return (
    <article className={`ad-card inline-ad ${primary ? "inline-ad-primary" : ""} ${ad ? "" : "is-empty"}`} id={`sponsor-slot-${slotNumber}`}>
      <span className="slot">Ad {slotNumber}</span>
      {ad?.artworkUrl ? <img src={ad.artworkUrl} alt={`${ad.businessName} advertisement`} /> : null}
      <h3>{ad?.businessName || "Available Sponsor Slot"}</h3>
      <div className="ad-copy">
        <p>{ad?.generatedHeadline || ad?.title || "Advertise Here"}</p>
        <p>{ad?.generatedSubheadline || ad?.offer || "Reach restroom readers in this venue."}</p>
      </div>
      <div className="ad-actions">
        <a href={ad?.targetUrl || "/signin"}>{ad?.ctaText || "Book Slot"}</a>
        {ad?.couponCode ? <span className="coupon">{ad.couponCode}</span> : null}
      </div>
    </article>
  );
}

function IssueContent({ issue, ads, venueDrafts, restaurantReviews }: { issue: IssueWithContext; ads: ServedAds; venueDrafts: Array<{ id: string; title: string; body: string; imageUrl: string | null }>; restaurantReviews: RestaurantReviewItem[] }) {
  const placedSlots = new Set<number>();
  const nextAdAfterBlock = (index: number) => {
    const slotNumber = index + 2;
    if (slotNumber > 8) return null;
    placedSlots.add(slotNumber);
    return <AdPlacement key={`ad-${slotNumber}`} ads={ads} slotNumber={slotNumber} />;
  };

  return (
    <section className="print-grid">
      <MissionCard missionText="Our mission is to inspire, inform, educate, and entertain humanity — all from the comfort of your very own stall." />
      {venueDrafts.map((draft) => <section key={draft.id} className="panel secondary-card"><h2>{draft.title}</h2>{draft.imageUrl ? <img src={draft.imageUrl} alt="" className="content-image" /> : null}<p className="article-copy whitespace-pre-wrap">{draft.body}</p></section>)}
      {restaurantReviews.length ? <RestaurantReviewsSection reviews={restaurantReviews} issue={issue} /> : null}
      <PublicationAd ad={ads[0] || undefined} slotNumber={1} primary />
      {issue.contentBlocks.flatMap((block, index) => [
        <article key={block.id} className={`panel ${index % 2 === 0 ? "feature-card" : "secondary-card"}`}>
          <h2>{block.title}</h2>
          <div className="article-copy whitespace-pre-wrap">{block.body}</div>
        </article>,
        nextAdAfterBlock(index)
      ].filter(Boolean))}
      {[2, 3, 4, 5, 6, 7, 8].filter((slotNumber) => !placedSlots.has(slotNumber)).map((slotNumber) => <AdPlacement key={`remaining-ad-${slotNumber}`} ads={ads} slotNumber={slotNumber} />)}
      <section className="sponsor-directory panel">
        <p className="directory-kicker">Sponsor Directory</p>
        <h2>Featured Sponsors</h2>
        <p>Eight inline publication ad slots support restroom, venue, city, and global targeting.</p>
      </section>
    </section>
  );
}

function reviewPriority(review: RestaurantReviewItem, venueId: string) {
  if (review.venueId === venueId) return 3;
  if (review.venueIds.includes(venueId)) return 2;
  return 1;
}

function RestaurantReviewsSection({ reviews, issue }: { reviews: RestaurantReviewItem[]; issue: IssueWithContext }) {
  const [featured, ...rest] = reviews;
  return (
    <section className="grid min-w-0 gap-4" aria-label="Restaurant reviews">
      <div className="rounded-[1.5rem] border-4 border-ink bg-stallYellow p-4 shadow-brutal">
        <p className="text-xs font-black uppercase tracking-[.3em] text-stallPurple">Featured Review / Dining Guide</p>
        <h2 className="font-display text-5xl uppercase leading-none md:text-7xl">Where to Eat Near {issue.venue?.name || "this venue"}</h2>
        <p className="mt-2 font-black uppercase">Venue-specific reviews appear first, followed by Las Vegas and global picks.</p>
      </div>
      <RestaurantReviewCard review={featured} publisherId={issue.publisherId} venueId={issue.venueId} issueId={issue.id} featured />
      {rest.length ? <div className="flex snap-x gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:overflow-visible">{rest.map((review) => <div key={review.id} className="min-w-[88vw] snap-center md:min-w-0"><RestaurantReviewCard review={review} publisherId={issue.publisherId} venueId={issue.venueId} issueId={issue.id} /></div>)}</div> : null}
    </section>
  );
}
