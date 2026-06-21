import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import publishedIssue from "@/data/published-issue.json";
import { DEFAULT_PUBLIC_ISSUE_ID } from "@/lib/default-public-issue";

export const DEFAULT_GLOBAL_ISSUE_NUMBER = 900001;
export const DEFAULT_GLOBAL_BLOCKS = [
  ["MISSION", "Mission / Introduction", publishedIssue.missionText, { key: "mission" }],
  ["HILARIOUSLY_FUNNY", publishedIssue.humorTitle, publishedIssue.humorBody, { key: "funny" }],
  ["FEATURE_ARTICLE", "Why Las Vegas Is The Most Fascinating City In The World", 'Las Vegas never sleeps because the city was designed to keep the lights on, the music playing, and the next unforgettable moment just around the corner. More than 40 million visitors arrive each year chasing everything from once-in-a-lifetime weekends to annual traditions that feel brand new every time.\n\nThat energy spills far beyond casino floors. Las Vegas is home to thousands of restaurants, from celebrity-chef dining rooms and late-night noodle counters to neighborhood favorites locals protect like secrets. On any given night, hundreds of live shows, residencies, comedy rooms, magic acts, concerts, and lounge performances turn the city into a nonstop stage.\n\nThe city has also become a world-class sports destination, with major teams, championship events, and arenas that make game day feel like part spectacle, part civic celebration. Add massive conventions that bring entire industries to town, and Las Vegas becomes a meeting point for dreamers, builders, fans, performers, chefs, athletes, and entrepreneurs.\n\nWhat makes Las Vegas most fascinating is its constant reinvention. Hotels transform, skylines change, restaurants rotate, productions evolve, and new neighborhoods keep adding depth to the story. Tourists and locals coexist in a rhythm unlike anywhere else: visitors chase the fantasy while residents power the machine, build community, and know where the real gems are hiding.\n\nLas Vegas is not just a place with entertainment. It is a city engineered for experiences — a desert metropolis built to surprise people, feed them, seat them, thrill them, host them, and send them home with a story they cannot stop telling.', { key: "feature", subtitle: "The world's only city built entirely around entertainment." }],
  ["RESTAURANT_REVIEW", "Worth the Stop", "Featured Local Restaurant\n\nThis month’s pick is a local spot with strong atmosphere, good service, and food that makes it worth coming back for. Perfect for a casual lunch, date night, or a quick bite before heading back out.\n\nLas Vegas, NV", { key: "restaurant", restaurantName: "Featured Local Restaurant", reviewHeadline: "Worth the Stop", imageUrl: "/images/restaurant-review.jpg" }],
  ["EVENT_CALENDAR", "Calendar / Event Spotlight", publishedIssue.calendarText, { key: "events", eventTitle: "Event Spotlight", eventDate: "", eventTime: "", eventLocation: "Las Vegas, NV", eventDescription: "Submit local happenings to keep the monthly calendar moving.", eventUrl: "" }],
  ["LOCAL_DEALS", "Deals Worth Leaving the Stall For", "Fresh venue-friendly offers, coupons, and neighborhood specials for Potty Favor readers.\n\nCheck this issue’s sponsor panels for timely discounts, featured experiences, and limited-time local offers near your venue.", { key: "deals" }],
  ["TRIVIA", "Did You Know?", publishedIssue.didYouKnow.join("\n"), { key: "trivia" }],
  ["INSPIRATIONAL_QUOTES", "Inspirational Quote", publishedIssue.quotes.join("\n"), { key: "quote" }],
  ["WORD_OF_THE_MONTH", "Community / Footer Note", `${publishedIssue.wordOfTheDay}: ${publishedIssue.wordDefinition}\n\nGot something happening nearby? Submit your event for Potty Favor review.`, { key: "community", word: publishedIssue.wordOfTheDay }],
] as const;

export const defaultGlobalIssueInclude = {
  venue: true,
  restroom: true,
  adSlots: { include: { ad: { include: { campaignHistory: true } } }, orderBy: { slotNumber: "asc" } },
  contentBlocks: { include: { article: true }, orderBy: { sortOrder: "asc" } },
} satisfies Prisma.IssueInclude;

export type DefaultGlobalIssue = Prisma.IssueGetPayload<{ include: typeof defaultGlobalIssueInclude }>;

async function ensureDefaultGlobalBlocks(issueId: string) {
  const existing = await prisma.issueContentBlock.findMany({ where: { issueId } });
  const byKey = new Map(existing.map((block) => [(block.layout as any)?.key, block]));
  for (const [type, title, body, layout] of DEFAULT_GLOBAL_BLOCKS) {
    const current = byKey.get((layout as any).key);
    if (!current) {
      await prisma.issueContentBlock.create({ data: { issueId, type: type as any, title, body, imageUrl: (layout as any).imageUrl, layout: layout as any, sortOrder: DEFAULT_GLOBAL_BLOCKS.findIndex(([, , , candidateLayout]) => (candidateLayout as any).key === (layout as any).key) + 1 } });
      continue;
    }
    if ((layout as any).key === "feature") {
      await prisma.issueContentBlock.update({ where: { id: current.id }, data: { type: type as any, title, body, layout: { ...(current.layout as any || {}), ...(layout as any) }, sortOrder: 3 } });
    } else if ((layout as any).key === "deals") {
      await prisma.issueContentBlock.update({ where: { id: current.id }, data: { type: type as any, layout: { ...(current.layout as any || {}), ...(layout as any) } } });
    }
  }
}

export async function getDefaultGlobalIssue({ createIfMissing = false } = {}) {
  const issue = await prisma.issue.findFirst({ where: { venueId: null, qrCodeId: null, restroomId: null, issueNumber: DEFAULT_GLOBAL_ISSUE_NUMBER }, include: defaultGlobalIssueInclude });
  if (issue) {
    await ensureDefaultGlobalBlocks(issue.id);
    return prisma.issue.findUnique({ where: { id: issue.id }, include: defaultGlobalIssueInclude });
  }
  if (!createIfMissing) return issue;
  const publisher = await prisma.publisher.findFirst({ orderBy: { createdAt: "asc" } });
  if (!publisher) return null;
  const [month, yearText] = publishedIssue.issueMonthYear.split(" ");
  const created = await prisma.issue.create({
    data: {
      publisherId: publisher.id, venueId: null, title: publishedIssue.mastheadBrand || "Potty Favor", month: month || "June", year: Number(yearText) || new Date().getFullYear(), issueNumber: DEFAULT_GLOBAL_ISSUE_NUMBER, status: "PUBLISHED", publishedAt: new Date(),
      contentBlocks: { create: DEFAULT_GLOBAL_BLOCKS.map(([type, title, body, layout], index) => ({ type: type as any, title, body, imageUrl: (layout as any).imageUrl, layout: layout as any, sortOrder: index + 1 })) },
    },
  });
  const campaigns = await prisma.stalltalkCampaignHistory.findMany({ where: { targetType: DEFAULT_PUBLIC_ISSUE_ID, publishStatus: "PUBLISHED", ad: { status: "ACTIVE" } }, include: { ad: true }, orderBy: [{ slotPublished: "asc" }, { publishedAt: "desc" }] });
  for (const campaign of campaigns) if (campaign.slotPublished && campaign.ad) await prisma.issueAdSlot.upsert({ where: { issueId_slotNumber: { issueId: created.id, slotNumber: campaign.slotPublished } }, update: { adId: campaign.ad.id, source: campaign.ad.scope }, create: { issueId: created.id, slotNumber: campaign.slotPublished, adId: campaign.ad.id, source: campaign.ad.scope } });
  return prisma.issue.findUnique({ where: { id: created.id }, include: defaultGlobalIssueInclude });
}
