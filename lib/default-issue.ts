import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import publishedIssue from "@/data/published-issue.json";
import { DEFAULT_GLOBAL_BLOCKS } from "@/lib/default-global-issue";
import { SPONSOR_PLACEMENTS } from "@/lib/sponsor-placements";
import { DEFAULT_ISSUE_UNAVAILABLE_MESSAGE, createFallbackDefaultIssue, getOrCreateDefaultIssue } from "@/lib/defaultIssue";

export const DEFAULT_ISSUE_ID = "global";
export const DEFAULT_ISSUE_TITLE = "Potty Favor Global Issue";
export const DEFAULT_ISSUE_SLUG = "default-public-issue";

export type DefaultIssuePayload = {
  id: string;
  title: string;
  slug: string;
  month: string;
  year: number;
  status: string;
  contentBlocks: any[];
  adSlots: any[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export function createDefaultIssueJson(): DefaultIssuePayload {
  const [month, yearText] = (publishedIssue.issueMonthYear || "June 2026").split(" ");
  return {
    id: DEFAULT_ISSUE_ID,
    title: DEFAULT_ISSUE_TITLE,
    slug: DEFAULT_ISSUE_SLUG,
    month: month || "June",
    year: Number(yearText) || new Date().getFullYear(),
    status: "PUBLISHED",
    contentBlocks: DEFAULT_GLOBAL_BLOCKS.map(([type, title, body, layout], index) => ({
      id: `${DEFAULT_ISSUE_ID}-block-${(layout as any).key || index + 1}`,
      type,
      title,
      body,
      imageUrl: (layout as any).imageUrl || null,
      layout,
      sortOrder: index + 1,
      article: null,
    })),
    adSlots: SPONSOR_PLACEMENTS.map((placement) => ({
      id: `${DEFAULT_ISSUE_ID}-slot-${placement.number}`,
      slotNumber: placement.number,
      adId: null,
      source: "GLOBAL",
      ad: null,
    })),
  };
}

async function hydrateDefaultIssue(issue: { id: string; title: string; slug: string; issueJson?: Prisma.JsonValue | null; createdAt: Date; updatedAt: Date; status?: string | null; publishedAt?: Date | null; __fallback?: boolean; __message?: string }) {
  const issueJson = ((issue.issueJson || {}) as any) as DefaultIssuePayload;
  const adIds = (issueJson.adSlots || []).map((slot: any) => slot.adId).filter(Boolean);
  let ads: any[] = [];
  try {
    ads = adIds.length ? await prisma.ad.findMany({ where: { id: { in: adIds }, status: "ACTIVE" }, include: { campaignHistory: true } }) : [];
  } catch (error) {
    console.error(DEFAULT_ISSUE_UNAVAILABLE_MESSAGE, error);
  }
  const byId = new Map(ads.map((ad) => [ad.id, ad]));
  return {
    ...createDefaultIssueJson(),
    ...issueJson,
    id: issue.id,
    title: issue.title || issueJson.title || DEFAULT_ISSUE_TITLE,
    slug: issue.slug || issueJson.slug || DEFAULT_ISSUE_SLUG,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    publisherId: "default",
    defaultIssueId: issue.id,
    venueId: null,
    restroomId: null,
    qrCodeId: null,
    issueNumber: 1,
    scheduledAt: null,
    scheduledPublishAt: null,
    timezone: "America/Los_Angeles",
    isScheduled: false,
    isPublished: (issue.status || issueJson.status || "PUBLISHED") === "PUBLISHED",
    isArchived: false,
    replaceDefaultOnPublish: true,
    archivePreviousOnPublish: true,
    publishedAt: issue.publishedAt || issue.createdAt,
    fallbackMessage: issue.__fallback ? issue.__message || DEFAULT_ISSUE_UNAVAILABLE_MESSAGE : null,
    republishedAt: null,
    archivedAt: null,
    venue: null,
    restroom: null,
    qrCode: null,
    adSlots: (issueJson.adSlots || []).map((slot: any) => ({ ...slot, ad: slot.adId ? byId.get(slot.adId) || null : null })),
  };
}

export async function getDefaultIssue({ createIfMissing = true } = {}) {
  try {
    if (!createIfMissing) {
      const [existing] = await prisma.defaultIssue.findMany({ orderBy: { updatedAt: "desc" }, take: 1 });
      return existing ? hydrateDefaultIssue(existing) : null;
    }
    const issue = await getOrCreateDefaultIssue();
    return hydrateDefaultIssue(issue);
  } catch (error) {
    console.error(DEFAULT_ISSUE_UNAVAILABLE_MESSAGE, error);
    return hydrateDefaultIssue(createFallbackDefaultIssue());
  }
}

export async function saveDefaultIssue(input: any) {
  const fallback = createDefaultIssueJson();
  const issueJson = { ...fallback, ...input, title: input.title || DEFAULT_ISSUE_TITLE, slug: input.slug || DEFAULT_ISSUE_SLUG };
  const now = new Date();
  const saved = await prisma.defaultIssue.upsert({
    where: { id: input.id || DEFAULT_ISSUE_SLUG },
    update: { title: issueJson.title, slug: issueJson.slug, status: issueJson.status || "PUBLISHED", issueJson: issueJson as any },
    create: { id: input.id || DEFAULT_ISSUE_SLUG, title: issueJson.title, slug: issueJson.slug, month: now.getMonth() + 1, year: now.getFullYear(), status: issueJson.status || "PUBLISHED", publishedAt: now, issueJson: issueJson as any },
  });
  return hydrateDefaultIssue(saved);
}
