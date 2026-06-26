import { AdStudioAgency } from "@/components/AdStudioAgency";
import { ProfileOnboarding } from "@/components/portal/ProfileOnboarding";
import { createAd } from "@/lib/actions";
import {
  AdvertiserProfileRequired,
  advertiserForPortalUser,
  requireAdvertiserPortalUser,
} from "@/lib/advertiser-portal";
import { DEFAULT_PUBLIC_ISSUE_TARGET } from "@/lib/default-public-issue";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const requiredColumns = [
  "parentCampaignId",
  "versionNumber",
  "targetUrl",
  "selectedSlot",
  "slotPublished",
  "publishStatus",
  "publishedAt",
  "logoBase64",
  "logoUrl",
  "headline",
  "subheadline",
  "ctaText",
  "couponCode",
  "viewCount",
  "clickCount",
  "lastViewedAt",
  "lastClickedAt",
  "targetType",
  "targetLabel",
  "publishedToHomepage",
  "creativeBrief",
];

function AdvertiserOnboarding() {
  return (
    <main className="min-h-screen bg-paper p-8 text-ink">
      <ProfileOnboarding
        title="Complete your advertiser profile"
        endpoint="/api/portal/advertiser/profile"
        button="Save Advertiser Profile"
        fields={[
          { name: "businessName", label: "Business name" },
          { name: "website", label: "Website", required: false },
          { name: "phone", label: "Phone", required: false },
          { name: "category", label: "Category", required: false },
        ]}
      />
    </main>
  );
}

export default async function AdvertiserAdStudioPage() {
  const user = await requireAdvertiserPortalUser();
  const advertiser = await advertiserForPortalUser(user);
  if (!advertiser) return user.role === "ADVERTISER" ? <AdvertiserOnboarding /> : <AdvertiserProfileRequired />;

  const advertiserWhere = { advertiserId: advertiser.id };
  const existingRows = process.env.DATABASE_URL
    ? await prisma.$queryRaw<
        Array<{ column_name: string }>
      >`SELECT column_name FROM information_schema.columns WHERE table_name = 'stalltalk_campaign_history'`
    : [];
  const existing = new Set(existingRows.map((row) => row.column_name));
  const missing = requiredColumns.filter((column) => !existing.has(column));

  const [publishers, issues, recentCampaigns, savedCampaigns] = missing.length
    ? ([[], [], [], []] as const)
    : await Promise.all([
        prisma.publisher.findMany({ orderBy: { name: "asc" }, take: 1 }),
        prisma.issue.findMany({
          include: { venue: true },
          orderBy: { createdAt: "desc" },
          take: 12,
        }),
        prisma.ad.findMany({
          where: advertiserWhere,
          orderBy: { createdAt: "desc" },
          take: 8,
        }),
        prisma.stalltalkCampaignHistory.findMany({
          where: advertiserWhere,
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
      ]);

  return (
    <main className="min-h-screen bg-paper p-4 text-ink md:p-8">
      <AdStudioAgency
        mode="advertiser"
        createAd={createAd}
        serverWarning={
          missing.length
            ? `Database migration required. Missing columns: ${missing.join(", ")}.`
            : undefined
        }
        publishers={publishers.map((publisher) => ({
          id: publisher.id,
          name: publisher.name,
        }))}
        advertisers={
          advertiser ? [{ id: advertiser.id, name: advertiser.name }] : []
        }
        venues={[]}
        restrooms={[]}
        issues={[
          DEFAULT_PUBLIC_ISSUE_TARGET as any,
          ...issues.map((issue) => ({
            id: issue.id,
            title: issue.title,
            label: issue.title,
            status: issue.status,
            venueName: issue.venue?.name || "Public",
            venue: issue.venue,
          })),
        ]}
        recentCampaigns={recentCampaigns.map((ad) => ({
          id: ad.id,
          businessName: ad.businessName,
          title: ad.title,
          offer: ad.offer,
          ctaText: ad.ctaText,
          couponCode: ad.couponCode,
          createdAt: ad.createdAt.toISOString(),
        }))}
        savedCampaigns={savedCampaigns.map((campaign) => ({
          campaignId: campaign.campaignId,
          parentCampaignId: campaign.parentCampaignId,
          versionNumber: campaign.versionNumber,
          businessName: campaign.business,
          headline: campaign.headline || "",
          subheadline: campaign.subheadline || "",
          ctaText: campaign.ctaText || "Claim Offer",
          couponCode: campaign.couponCode || "",
          adSize: "Editorial Magazine Ad",
          imageUrl: campaign.image || "",
          promptUsed: campaign.prompt || "",
          creativeBrief: campaign.creativeBrief || "",
          createdAt: campaign.createdAt.toISOString(),
          slotPublished: campaign.slotPublished,
          selectedSlot: campaign.selectedSlot,
          targetUrl: campaign.targetUrl,
          logoBase64: campaign.logoBase64,
          publishStatus: campaign.publishStatus,
          publishedAt: campaign.publishedAt?.toISOString() || null,
          targetLabel: campaign.targetLabel,
          targetType: campaign.targetType,
          viewCount: campaign.viewCount,
          clickCount: campaign.clickCount,
          lastClickedAt: campaign.lastClickedAt?.toISOString() || null,
        }))}
      />
    </main>
  );
}
