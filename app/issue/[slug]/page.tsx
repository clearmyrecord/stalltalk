import GlobalIssuePage from "../page";
import type { Prisma } from "@prisma/client";
import { ImpressionRecorder } from "@/components/ImpressionRecorder";
import { ScanRecorder } from "@/components/ScanRecorder";
import { RestaurantReviewCard } from "@/components/RestaurantReviewCard";
import { getServedAds } from "@/lib/ad-serving";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MissionCard, PublicationHeader } from "@/components/PublicationIssueChrome";
import { getPublicationAds, PublicationAdFallback, StaticPublicationBlocks, type PublicationAdLike } from "@/components/StaticPublicationBlocks";
import { IssueNotFound } from "@/components/IssueNotFound";
import { SPONSOR_PLACEMENTS } from "@/lib/sponsor-placements";
import { StaticIssuePage, requestFromHeaders } from "../static-issue-page";
import { withPublicTimeout } from "@/lib/public-route-timeouts";

export const dynamic = "force-dynamic";
type IssueWithContext = Prisma.IssueGetPayload<{ include: { publisher: true; venue: true; restroom: true; qrCode: true; contentBlocks: { include: { article: true } }; adSlots: { include: { ad: { include: { campaignHistory: true } } } }; importedEvents: true } }>;
type ServedAds = Awaited<ReturnType<typeof getServedAds>>;
type RestaurantReviewItem = Prisma.RestaurantReviewGetPayload<{}>;

export default async function IssuePage({ params, searchParams }: { params: Promise<{ slug?: string; venueSlug?: string }>; searchParams: Promise<{ qr?: string; previewIssueId?: string }> }) {
  const { slug, venueSlug: legacyVenueSlug } = await params;
  const routeSlug = slug || legacyVenueSlug || "";
  const query = await searchParams;
  const { qr, previewIssueId } = query;
  const request = await requestFromHeaders(`/issue/${encodeURIComponent(routeSlug)}${qr ? `?qr=${encodeURIComponent(qr)}` : ""}`);

  try {
    const issue = await withPublicTimeout(
      prisma.issue.findFirst({ where: { slug: routeSlug }, include: { venue: true } }),
      "specific issue lookup",
    );
    if (issue) {
      const canView = await canViewIssue(issue);
      if (!canView) return <IssueNotFound title="Issue not available" message="This issue is not published yet." />;
      const routedQuery = { ...query, previewIssueId: issue.id };
      if (issue.venue?.slug) return await renderVenueIssue({ venueSlug: issue.venue.slug, qr, previewIssueId: issue.id });
      return <GlobalIssuePage searchParams={Promise.resolve(routedQuery)} />;
    }

    return await withPublicTimeout(renderVenueIssue({ venueSlug: routeSlug, qr, previewIssueId }), "venue issue database route");
  } catch (error) {
    console.error("Issue database load failed; rendering static issue fallback.", error);
    return <StaticIssuePage qrCode={qr} request={request} />;
  }
}

async function canViewIssue(issue: { status: string; isPublished: boolean; isArchived: boolean; venueId?: string | null }) {
  if (issue.status === "PUBLISHED" && issue.isPublished && !issue.isArchived) return true;
  const user = await currentUser();
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return user.role === "VENUE_MANAGER" && Boolean(issue.venueId) && user.venueId === issue.venueId;
}

async function renderVenueIssue({ venueSlug, qr, previewIssueId }: { venueSlug: string; qr?: string; previewIssueId?: string }) {
  const requestedVenue = await prisma.venue.findFirst({ where: { slug: venueSlug, isActive: true } });
  if (!requestedVenue) return <IssueNotFound title="Venue issue not found" message="This venue is not active or does not have a public issue route yet." />;

  const issueInclude = { publisher: true, venue: true, restroom: true, qrCode: true, contentBlocks: { include: { article: true }, orderBy: { sortOrder: "asc" } }, adSlots: { include: { ad: { include: { campaignHistory: true } } }, orderBy: { slotNumber: "asc" } }, importedEvents: { where: { status: { in: ["APPROVED", "PUBLISHED"] } }, orderBy: { date: "asc" } } } satisfies Prisma.IssueInclude;
  const previewCandidate = previewIssueId ? await prisma.issue.findFirst({
    where: { id: previewIssueId, OR: [{ venueId: null }, { venueId: requestedVenue.id }] },
    include: issueInclude
  }) : null;
  const previewIssue = previewCandidate && await canViewIssue(previewCandidate) ? previewCandidate : null;
  const directIssue = previewIssue || await prisma.issue.findFirst({
    where: { venueId: requestedVenue.id, status: "PUBLISHED", isArchived: false, ...(qr ? { qrCode: { qrSlug: qr } } : {}) },
    orderBy: [{ year: "desc" }, { issueNumber: "desc" }],
    include: issueInclude
  });
  const issue = directIssue || await prisma.issue.findFirst({
    where: { status: "PUBLISHED", isArchived: false, OR: [{ venueId: null }, { venueId: requestedVenue.id }] },
    orderBy: [{ year: "desc" }, { issueNumber: "desc" }],
    include: issueInclude
  });
  if (!issue) return <IssueNotFound message={`No published issue is available for ${requestedVenue.name} yet.`} />;
  const renderIssue = issue as IssueWithContext & { venue: NonNullable<IssueWithContext["venue"]> };
  renderIssue.venue = requestedVenue;
  renderIssue.venueId = requestedVenue.id;
  renderIssue.restroomId = directIssue?.restroomId || null;
  renderIssue.qrCodeId = directIssue?.qrCodeId || null;
  renderIssue.contentBlocks = issue.contentBlocks.filter((block) => (!block.article || block.article.status === "PUBLISHED") && (!block.venueIds.length || block.venueIds.includes(requestedVenue.id)));
  const approvedVenueDrafts = await prisma.venueContentDraft.findMany({ where: { venueId: requestedVenue.id, approvalStatus: "APPROVED" }, orderBy: { approvedAt: "desc" }, take: 3 });
  const now = new Date();
  const restaurantReviews = renderIssue.publisherId ? await prisma.restaurantReview.findMany({
    where: {
      publisherId: renderIssue.publisherId,
      status: "PUBLISHED",
      AND: [
        { OR: [{ publishDate: null }, { publishDate: { lte: now } }] },
        { OR: [{ venueId: requestedVenue.id }, { venueIds: { has: requestedVenue.id } }, { venueId: null, venueIds: { isEmpty: true } }] }
      ]
    },
    orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }]
  }) : [];
  const sortedReviews = restaurantReviews.sort((a, b) => reviewPriority(b, requestedVenue.id) - reviewPriority(a, requestedVenue.id));
  const ads = await withPublicTimeout(getServedAds(renderIssue), "venue served ads lookup");
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
      <nav className="mobile-sponsor-nav" aria-label="Sponsor placements">
        <div>{SPONSOR_PLACEMENTS.map((placement) => <a key={placement.number} href={`#ad-${placement.number}`} aria-label={placement.label}>{placement.number}</a>)}</div>
      </nav>
    </main>
  );
}

function IssueContent({ issue, ads }: { issue: IssueWithContext; ads: ServedAds; venueDrafts: Array<{ id: string; title: string; body: string; imageUrl: string | null }>; restaurantReviews: RestaurantReviewItem[] }) {
  const articleBlocks = issue.contentBlocks.filter((block) => block.type === "ARTICLE");
  const [mainFeature, secondaryFeature] = articleBlocks;
  const publicationAds = getPublicationAds(ads.map((ad) => ad || undefined) as PublicationAdLike[]);
  const missionBlock = issue.contentBlocks.find((block) => block.type === "MISSION" || (block.layout as any)?.key === "mission");

  return (
    <section className="print-grid">
      <MissionCard missionText={missionBlock?.body || "Our mission is to inspire, inform, educate, and entertain humanity — all from the comfort of your very own stall."} />
      <PublicationAdFallback ad={publicationAds[0]} slotNumber={1} primary />
      <StaticPublicationBlocks ads={publicationAds} qrCode={issue.qrCode?.qrSlug} mainFeature={mainFeature ? { title: mainFeature.title, body: mainFeature.body } : undefined} secondaryFeature={secondaryFeature ? { title: secondaryFeature.title, body: secondaryFeature.body } : undefined} blocks={issue.contentBlocks} />
      <JulyEventsSection events={(issue as any).importedEvents || []} />
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


function JulyEventsSection({ events }: { events: Array<{ id: string; title: string; date: Date; startTime: string | null; endTime: string | null; venue: string; address: string | null; description: string; category: string | null; priceLabel: string | null; sourceName: string; sourceUrl: string; imageUrl: string | null }> }) {
  if (!events.length) return <section className="calendar-card panel"><h2>Event Calendar</h2><p>No verified July 2026 Las Vegas community events found yet.</p></section>;
  return <section className="calendar-card panel"><h2>Event Calendar</h2>{events.map((event) => <article key={event.id} className="event-spotlight"><h3>{event.title}</h3><p>{event.date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Los_Angeles" })} {event.startTime ? `• ${event.startTime}${event.endTime ? `–${event.endTime}` : ""}` : ""}</p><p>{event.venue}{event.address ? ` • ${event.address}` : ""}</p><p>{event.description}</p><p>{event.category || "Community"} • {event.priceLabel || "See source"}</p><p><a href={event.sourceUrl}>Event info sourced from {event.sourceName}.</a></p></article>)}</section>;
}
