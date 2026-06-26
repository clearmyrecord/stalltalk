import IssueByVenuePage from "./[slug]/page";
import {
  MissionCard,
  PublicationFooter,
  PublicationHeader,
} from "@/components/PublicationIssueChrome";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServedAds } from "@/lib/ad-serving";
import publishedIssue from "@/data/published-issue.json";
import {
  getPublicationAds,
  PublicationAdFallback,
  StaticPublicationBlocks,
  type PublicationAdLike,
} from "@/components/StaticPublicationBlocks";
import { DEFAULT_PUBLIC_ISSUE_ID } from "@/lib/default-public-issue";
import { getDefaultGlobalIssue } from "@/lib/default-global-issue";
import { DEFAULT_ISSUE_UNAVAILABLE_MESSAGE } from "@/lib/defaultIssue";
import { recordAdImpression, recordQrScan } from "@/lib/tracking";
import {
  PUBLIC_ANALYTICS_TIMEOUT_MS,
  withPublicTimeout,
} from "@/lib/public-route-timeouts";
import { StaticIssuePage, requestFromHeaders } from "./static-issue-page";

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
    importedEvents: true;
  };
}>;

export default async function IssueQueryPage({
  searchParams,
}: {
  searchParams: Promise<IssueSearchParams>;
}) {
  const { venue, qr, previewIssueId } = await searchParams;
  const request = await requestFromHeaders(
    `/issue${qr ? `?qr=${encodeURIComponent(qr)}` : ""}`,
  );

  if (!venue && !qr && !previewIssueId) {
    return <StaticIssuePage qrCode={undefined} request={request} />;
  }

  if (qr) {
    try {
      await withPublicTimeout(
        recordQrScan({ code: qr, request, source: "issue-query" }),
        "issue QR scan analytics",
        PUBLIC_ANALYTICS_TIMEOUT_MS,
      );
    } catch (error) {
      console.error("Issue query QR scan analytics failed", error);
    }
  }

  try {
    return await withPublicTimeout(
      loadDatabaseBackedIssue({ venue, qr, previewIssueId, request }),
      "public issue database route",
    );
  } catch (error) {
    console.error(
      "Public issue database load failed; rendering static fallback issue.",
      error,
    );
    return <StaticIssuePage qrCode={qr} request={request} />;
  }
}

async function loadDatabaseBackedIssue({
  venue,
  qr,
  previewIssueId,
  request,
}: {
  venue?: string;
  qr?: string;
  previewIssueId?: string;
  request: Request;
}) {
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
    return (
      <DatabaseIssuePage
        issue={defaultGlobalIssue as unknown as IssueWithAds}
        qrCode={qr}
        request={request}
      />
    );
  }

  const hasDefaultPublicAds = await prisma.stalltalkCampaignHistory.findFirst({
    where: {
      targetType: DEFAULT_PUBLIC_ISSUE_ID,
      publishStatus: "PUBLISHED",
      ad: { status: "ACTIVE" },
    },
    select: { id: true },
  });

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
      importedEvents: {
        where: { status: { in: ["APPROVED", "PUBLISHED"] } },
        orderBy: { date: "asc" },
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
    return (
      <DatabaseIssuePage
        issue={latestPublishedIssue as IssueWithAds}
        qrCode={qr}
        request={request}
      />
    );
  }

  return <StaticIssuePage qrCode={qr} request={request} />;
}

async function DatabaseIssuePage({
  issue,
  qrCode,
  request,
}: {
  issue: IssueWithAds;
  qrCode?: string;
  request: Request;
}) {
  let ads: Awaited<ReturnType<typeof getServedAds>> = [];

  try {
    ads = await withPublicTimeout(getServedAds(issue), "served ads lookup");
  } catch (error) {
    console.error(DEFAULT_ISSUE_UNAVAILABLE_MESSAGE, error);
  }

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

  await withPublicTimeout(
    Promise.all(
      publicationAds.map((ad, index) =>
        recordAdImpression({
          adId: ad.id,
          campaignId: (ad as any).campaignId,
          slotNumber: index + 1,
          qrCode,
          venueId: issue.venueId,
          issueId: issue.id,
          request,
        }).catch((error) =>
          console.error("Ad impression analytics failed", error),
        ),
      ),
    ),
    "database issue impression analytics",
    PUBLIC_ANALYTICS_TIMEOUT_MS,
  ).catch((error) => console.error("Ad impression analytics timed out", error));

  const articleBlocks = issue.contentBlocks.filter(
    (block) =>
      block.type === "ARTICLE" &&
      (!block.article || block.article.status === "PUBLISHED"),
  );

  const byKey = (key: string) =>
    issue.contentBlocks.find((block) => (block.layout as any)?.key === key);

  const [mainFeature, secondaryFeature] = articleBlocks;

  return (
    <main className="public-page">
      <article className="publication" aria-label="Potty Favor monthly issue">
        {(issue as any).fallbackMessage ? (
          <p className="m-3 rounded-xl border-4 border-stallRed bg-white p-3 text-center font-black text-stallRed">
            {(issue as any).fallbackMessage}
          </p>
        ) : null}

        <PublicationHeader monthYear={`${issue.month} ${issue.year}`} />

        <section className="print-grid">
          <MissionCard
            missionText={byKey("mission")?.body || publishedIssue.missionText}
          />

          <PublicationAdFallback
            ad={publicationAds[0]}
            slotNumber={1}
            qrCode={qrCode}
            primary
          />

          <StaticPublicationBlocks
            ads={publicationAds}
            qrCode={qrCode}
            blocks={issue.contentBlocks.map((block) => ({
              title: block.title,
              body: block.body,
              imageUrl: block.imageUrl,
              layout: block.layout as any,
            }))}
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

          <JulyEventsSection events={issue.importedEvents || []} />
        </section>

        <PublicationFooter />
      </article>
    </main>
  );
}

function JulyEventsSection({
  events,
}: {
  events: Array<{
    id: string;
    title: string;
    date: Date;
    startTime: string | null;
    endTime: string | null;
    venue: string;
    address: string | null;
    description: string;
    category: string | null;
    priceLabel: string | null;
    sourceName: string;
    sourceUrl: string;
    imageUrl: string | null;
  }>;
}) {
  if (!events.length) {
    return (
      <section className="calendar-card panel">
        <h2>Event Calendar</h2>
        <p>No verified July 2026 Las Vegas community events found yet.</p>
      </section>
    );
  }

  return (
    <section className="calendar-card panel">
      <h2>Event Calendar</h2>
      {events.map((event) => (
        <article key={event.id} className="event-spotlight">
          <h3>{event.title}</h3>
          <p>
            {event.date.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              timeZone: "America/Los_Angeles",
            })}
            {event.startTime
              ? ` • ${event.startTime}${event.endTime ? `–${event.endTime}` : ""}`
              : ""}
          </p>
          <p>
            {event.venue}
            {event.address ? ` • ${event.address}` : ""}
          </p>
          <p>{event.description}</p>
          <p>
            {event.category || "Community"} • {event.priceLabel || "See source"}
          </p>
          <p>
            <a href={event.sourceUrl}>
              Event info sourced from {event.sourceName}.
            </a>
          </p>
        </article>
      ))}
    </section>
  );
}
