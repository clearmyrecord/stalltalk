import { CampaignLibrary } from "@/components/CampaignLibrary";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PUBLIC_ISSUE_ID, DEFAULT_PUBLIC_ISSUE_LABEL, DEFAULT_PUBLIC_ISSUE_TARGET } from "@/lib/default-public-issue";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const [campaigns, issues] = await Promise.all([
    prisma.stalltalkCampaignHistory.findMany({ where: { publishStatus: { notIn: ["ARCHIVED", "DELETED"] } }, include: { ad: { include: { issueSlots: { include: { issue: { include: { venue: true } } }, orderBy: { slotNumber: "asc" }, take: 1 } } } }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.issue.findMany({ include: { venue: true }, orderBy: [{ year: "desc" }, { issueNumber: "desc" }] })
  ]);

  return <CampaignLibrary campaigns={campaigns.map((item) => {
    const issueSlot = item.ad?.issueSlots?.[0];
    const isDefaultTarget = item.targetType === DEFAULT_PUBLIC_ISSUE_ID;
    return { campaignId: item.campaignId, parentCampaignId: item.parentCampaignId, versionNumber: item.versionNumber, businessName: item.business, headline: item.headline || "", subheadline: item.subheadline || "", ctaText: item.ctaText || "Claim Offer", couponCode: item.couponCode || "", imageUrl: item.image || "", promptUsed: item.prompt, targetUrl: item.targetUrl || "", selectedSlot: item.selectedSlot, slotPublished: item.slotPublished, publishStatus: item.publishStatus, createdAt: item.createdAt.toISOString(), publishedAt: item.publishedAt?.toISOString() || null, issueId: issueSlot?.issueId || (isDefaultTarget ? DEFAULT_PUBLIC_ISSUE_ID : null), issueTitle: item.targetLabel || issueSlot?.issue?.title || (isDefaultTarget ? DEFAULT_PUBLIC_ISSUE_LABEL : null), venueName: isDefaultTarget ? "Public" : issueSlot?.issue?.venue?.name || null, targetType: item.targetType, targetLabel: item.targetLabel, publisherId: item.publisherId || "", advertiserId: item.advertiserId || "" };
  })} issues={[DEFAULT_PUBLIC_ISSUE_TARGET, ...issues.map((issue) => ({ id: issue.id, title: issue.title, venueName: issue.venue?.name || "Global Issue" }))]} />;
}
