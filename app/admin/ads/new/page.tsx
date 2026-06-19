import { AdStudioAgency } from "@/components/AdStudioAgency";
import { createAd } from "@/lib/actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
type PublisherRecord = { id: string; name: string };
type AdvertiserRecord = { id: string; name: string };
type VenueRecord = { id: string; name: string; city: string; state: string };
type RestroomRecord = { id: string; name: string; venue: { name: string } | null };
type IssueRecord = { id: string; title: string; status: string; venue: { name: string } | null };
type AdRecord = { id: string; businessName: string; title: string; offer: string; ctaText: string; couponCode: string | null; createdAt: Date };
type CampaignRecord = { campaignId: string; parentCampaignId: string | null; versionNumber: number; business: string; headline: string | null; subheadline: string | null; ctaText: string | null; couponCode: string | null; adSize: string; image: string | null; prompt: string; createdAt: Date; slotPublished: number | null; selectedSlot: number | null; targetUrl: string | null; logoBase64: string | null; publishStatus: string | null };

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
  issues: [],
  recentCampaigns: [],
  savedCampaigns: []
};

async function loadAdStudioData(): Promise<AdStudioData> {
  if (!process.env.DATABASE_URL) {
    return { ...EMPTY_DATA, warning: "Database is not configured. Add DATABASE_URL to load admin publishing data." };
  }

  try {
    const [publishers, advertisers, venues, restrooms, issues, recentCampaigns, savedCampaigns] = await Promise.all([
      prisma.publisher.findMany({ orderBy: { name: "asc" } }),
      prisma.advertiser.findMany({ orderBy: { name: "asc" } }),
      prisma.venue.findMany({ orderBy: { name: "asc" } }),
      prisma.restroom.findMany({ include: { venue: true }, orderBy: { name: "asc" } }),
      prisma.issue.findMany({ include: { venue: true }, orderBy: { createdAt: "desc" }, take: 12 }),
      prisma.ad.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
      prisma.stalltalkCampaignHistory.findMany({ orderBy: { createdAt: "desc" }, take: 24 })
    ]);

    return {
      publishers: publishers as PublisherRecord[],
      advertisers: advertisers as AdvertiserRecord[],
      venues: venues as VenueRecord[],
      restrooms: restrooms as RestroomRecord[],
      issues: issues as IssueRecord[],
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
      issues={issues.map((issue) => ({ id: issue.id, title: issue.title, venueName: issue.venue?.name || "Global Issue", status: issue.status }))}
      recentCampaigns={recentCampaigns.map((ad) => ({ id: ad.id, businessName: ad.businessName, title: ad.title, offer: ad.offer, ctaText: ad.ctaText, couponCode: ad.couponCode, createdAt: ad.createdAt.toISOString() }))}
      savedCampaigns={savedCampaigns.map((campaign) => ({ campaignId: campaign.campaignId, businessName: campaign.business, headline: campaign.headline || "", subheadline: campaign.subheadline || "", ctaText: campaign.ctaText || "Claim Offer", couponCode: campaign.couponCode || "", adSize: "3:1 Sponsor Banner", imageUrl: campaign.image || "", promptUsed: campaign.prompt, createdAt: campaign.createdAt.toISOString(), slotPublished: campaign.slotPublished, selectedSlot: campaign.selectedSlot, targetUrl: campaign.targetUrl, logoBase64: campaign.logoBase64, publishStatus: campaign.publishStatus, parentCampaignId: campaign.parentCampaignId, versionNumber: campaign.versionNumber }))}
    />
  );
}
