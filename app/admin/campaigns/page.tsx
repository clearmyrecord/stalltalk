import { CampaignLibrary } from "@/components/CampaignLibrary";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const [campaigns, issues] = await Promise.all([
    prisma.stalltalkCampaignHistory.findMany({ where: { publishStatus: { not: "ARCHIVED" } }, include: { ad: { include: { issueSlots: { include: { issue: { include: { venue: true } } }, orderBy: { slotNumber: "asc" }, take: 1 } } } }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.issue.findMany({ include: { venue: true }, orderBy: [{ year: "desc" }, { issueNumber: "desc" }] })
  ]);

  return <CampaignLibrary campaigns={campaigns.map((item) => {
    const issueSlot = item.ad?.issueSlots?.[0];
    return { campaignId: item.campaignId, parentCampaignId: item.parentCampaignId, versionNumber: item.versionNumber, businessName: item.business, headline: item.headline || "", subheadline: item.subheadline || "", ctaText: item.ctaText || "Claim Offer", couponCode: item.couponCode || "", imageUrl: item.image || "", promptUsed: item.prompt, targetUrl: item.targetUrl || "", selectedSlot: item.selectedSlot, slotPublished: item.slotPublished, publishStatus: item.publishStatus, createdAt: item.createdAt.toISOString(), publishedAt: item.publishedAt?.toISOString() || null, issueId: issueSlot?.issueId || null, issueTitle: issueSlot?.issue?.title || null, venueName: issueSlot?.issue?.venue?.name || null, publisherId: item.publisherId || "", advertiserId: item.advertiserId || "" };
  })} issues={issues.map((issue) => ({ id: issue.id, title: issue.title, venueName: issue.venue?.name || "Global Issue" }))} />;
}
