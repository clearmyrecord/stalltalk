import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import publishedIssue from "@/data/published-issue.json";
import { DEFAULT_PUBLIC_ISSUE_ID } from "@/lib/default-public-issue";

export const DEFAULT_GLOBAL_ISSUE_NUMBER = 900001;
export const DEFAULT_GLOBAL_BLOCKS = [
  ["ANNOUNCEMENT", "Mission / Introduction", publishedIssue.missionText, { key: "mission" }],
  ["ARTICLE", publishedIssue.humorTitle, publishedIssue.humorBody, { key: "funny" }],
  ["RESTAURANT_REVIEW", "Worth the Stop", "Featured Local Restaurant\n\nThis month’s pick is a local spot with strong atmosphere, good service, and food that makes it worth coming back for. Perfect for a casual lunch, date night, or a quick bite before heading back out.\n\nLas Vegas, NV", { key: "restaurant", restaurantName: "Featured Local Restaurant", reviewHeadline: "Worth the Stop", imageUrl: "/images/restaurant-review.jpg" }],
  ["EVENT", "Calendar / Event Spotlight", publishedIssue.calendarText, { key: "events", eventTitle: "Event Spotlight", eventDate: "", eventTime: "", eventLocation: "Las Vegas, NV", eventDescription: "Submit local happenings to keep the monthly calendar moving.", eventUrl: "" }],
  ["COUPON", "Deals Worth Leaving the Stall For", "Fresh venue-friendly offers, coupons, and neighborhood specials for Potty Favor readers.\n\nCheck this issue’s sponsor panels for timely discounts, featured experiences, and limited-time local offers near your venue.", { key: "deals" }],
  ["FACT", "Did You Know?", publishedIssue.didYouKnow.join("\n"), { key: "trivia" }],
  ["QUOTE", "Inspirational Quote", publishedIssue.quotes.join("\n"), { key: "quote" }],
  ["ANNOUNCEMENT", "Community / Footer Note", `${publishedIssue.wordOfTheDay}: ${publishedIssue.wordDefinition}\n\nGot something happening nearby? Submit your event for Potty Favor review.`, { key: "community", word: publishedIssue.wordOfTheDay }],
] as const;

export const defaultGlobalIssueInclude = {
  venue: true,
  restroom: true,
  adSlots: { include: { ad: { include: { campaignHistory: true } } }, orderBy: { slotNumber: "asc" } },
  contentBlocks: { include: { article: true }, orderBy: { sortOrder: "asc" } },
} satisfies Prisma.IssueInclude;

export type DefaultGlobalIssue = Prisma.IssueGetPayload<{ include: typeof defaultGlobalIssueInclude }>;

export async function getDefaultGlobalIssue({ createIfMissing = false } = {}) {
  const issue = await prisma.issue.findFirst({ where: { venueId: null, qrCodeId: null, restroomId: null, issueNumber: DEFAULT_GLOBAL_ISSUE_NUMBER }, include: defaultGlobalIssueInclude });
  if (issue || !createIfMissing) return issue;
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
