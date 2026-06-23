import { AdStudioAgency } from "@/components/AdStudioAgency";
import { createAd } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PUBLIC_ISSUE_TARGET } from "@/lib/default-public-issue";

export const dynamic = "force-dynamic";
type PublisherRecord = { id: string; name: string };
type AdvertiserRecord = { id: string; name: string };
type VenueRecord = { id: string; name: string; city: string; state: string };
type RestroomRecord = { id: string; name: string; venue: { name: string } | null };
type IssueRecord = { id: string; title: string; label?: string; status: string; month?: string; year?: number; venueName?: string; venue: { name: string } | null; restroom?: { name: string } | null; isDefault?: boolean; targetType?: string; isGlobalIssue?: boolean; isVenueIssue?: boolean; isLocationIssue?: boolean };
type AdRecord = { id: string; businessName: string; title: string; offer: string; ctaText: string; couponCode: string | null; createdAt: Date };
type CampaignRecord = { campaignId: string; parentCampaignId: string | null; versionNumber: number; business: string; headline: string | null; subheadline: string | null; ctaText: string | null; couponCode: string | null; adSize: string; image: string | null; prompt: string; creativeBrief: string | null; createdAt: Date; publishedAt: Date | null; slotPublished: number | null; selectedSlot: number | null; targetUrl: string | null; logoBase64: string | null; publishStatus: string | null; targetType: string | null; targetLabel: string | null };

type AdStudioData = {
  publishers: PublisherRecord[];
  advertisers: AdvertiserRecord[];
  venues: VenueRecord[];
  restrooms: RestroomRecord[];
  issues: IssueRecord[];
  recentCampaigns: AdRecord[];
  savedCampaigns: CampaignRecord[];
  warning?: string;
};

const EMPTY_DATA: AdStudioData = {
  publishers: [],
  advertisers: [],
  venues: [],
  restrooms: [],
  issues: [DEFAULT_PUBLIC_ISSUE_TARGET as unknown as IssueRecord],
  recentCampaigns: [],
  savedCampaigns: []
};

async function loadAdStudioData(): Promise<AdStudioData> {
  if (!process.env.DATABASE_URL) {
    return { ...EMPTY_DATA, warning: "Database is not configured. Add DATABASE_URL to load admin publishing data." };
  }

  try {
    const requiredColumns = ["parentCampaignId", "versionNumber", "targetUrl", "selectedSlot", "slotPublished", "publishStatus", "publishedAt", "logoBase64", "logoUrl", "headline", "subheadline", "ctaText", "couponCode", "viewCount", "clickCount", "lastViewedAt", "lastClickedAt", "targetType", "targetLabel", "publishedToHomepage", "creativeBrief"];
    const existingRows = await prisma.$queryRaw<Array<{ column_name: string }>>`SELECT column_name FROM information_schema.columns WHERE table_name = 'stalltalk_campaign_history'`;
    const existing = new Set(existingRows.map((row) => row.column_name));
    const missing = requiredColumns.filter((column) => !existing.has(column));
    if (missing.length) return { ...EMPTY_DATA, warning: `Database migration required. Missing columns: ${missing.join(", ")}.` };

    const [publishers, advertisers, venues, restrooms, issues, recentCampaigns, savedCampaigns] = await Promise.all([
      prisma.publisher.findMany({ orderBy: { name: "asc" } }),
      prisma.advertiser.findMany({ orderBy: { name: "asc" } }),
      prisma.venue.findMany({ orderBy: { name: "asc" } }),
      prisma.restroom.findMany({ include: { venue: true }, orderBy: { name: "asc" } }),
      prisma.issue.findMany({ include: { venue: true, restroom: true }, orderBy: [{ venueId: "asc" }, { restroomId: "asc" }, { year: "desc" }], take: 100 }),
      prisma.ad.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
      prisma.stalltalkCampaignHistory.findMany({ orderBy: { createdAt: "desc" }, take: 24 })
    ]);

    return {
      publishers: publishers as PublisherRecord[],
      advertisers: advertisers as AdvertiserRecord[],
      venues: venues as VenueRecord[],
      restrooms: restrooms as RestroomRecord[],
      issues: [DEFAULT_PUBLIC_ISSUE_TARGET as unknown as IssueRecord, ...(issues as IssueRecord[])],
      recentCampaigns: recentCampaigns as AdRecord[],
      savedCampaigns: savedCampaigns as CampaignRecord[]
    };
  } catch (error) {
    console.error("Unable to load Ad Studio data", error);
    return { ...EMPTY_DATA, warning: error instanceof Error ? `Unable to load admin publishing data: ${error.message}` : "Unable to load admin publishing data." };
  }
}

export default async function NewAdPage() {
  const { publishers, advertisers, venues, restrooms, issues, recentCampaigns, savedCampaigns, warning } = await loadAdStudioData();

  return (
    <AdStudioAgency
      createAd={createAd}
      serverWarning={warning}
      publishers={publishers.map((publisher) => ({ id: publisher.id, name: publisher.name }))}
      advertisers={advertisers.map((advertiser) => ({ id: advertiser.id, name: advertiser.name }))}
      venues={venues.map((venue) => ({ id: venue.id, name: venue.name, city: venue.city, state: venue.state }))}
      restrooms={restrooms.map((restroom) => ({ id: restroom.id, name: restroom.name, venueName: restroom.venue?.name || "Unknown Venue" }))}
      issues={issues.map((issue) => ({ id: issue.id, title: issue.title, label: issue.label || (issue.isDefault ? issue.title : `${issue.venue?.name || "Default Global Issue"} — ${issue.restroom?.name || (issue.venue ? "Venue-wide" : "Global")} — ${issue.month || ""} ${issue.year || ""}`.trim()), venueName: issue.venueName || issue.venue?.name || "Global Issue", status: issue.status, isDefault: Boolean(issue.isDefault), targetType: issue.targetType }))}
      recentCampaigns={recentCampaigns.map((ad) => ({ id: ad.id, businessName: ad.businessName, title: ad.title, offer: ad.offer, ctaText: ad.ctaText, couponCode: ad.couponCode, createdAt: ad.createdAt.toISOString() }))}
      savedCampaigns={savedCampaigns.map((campaign) => ({ campaignId: campaign.campaignId, businessName: campaign.business, headline: campaign.headline || "", subheadline: campaign.subheadline || "", ctaText: campaign.ctaText || "Claim Offer", couponCode: campaign.couponCode || "", adSize: "Editorial Magazine Ad", imageUrl: campaign.image || "", promptUsed: campaign.prompt, creativeBrief: campaign.creativeBrief, createdAt: campaign.createdAt.toISOString(), slotPublished: campaign.slotPublished, selectedSlot: campaign.selectedSlot, targetUrl: campaign.targetUrl, logoBase64: campaign.logoBase64, publishStatus: campaign.publishStatus, publishedAt: campaign.publishedAt?.toISOString() || null, targetType: campaign.targetType, targetLabel: campaign.targetLabel, parentCampaignId: campaign.parentCampaignId, versionNumber: campaign.versionNumber }))}
    />
  );
}
