import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PUBLIC_ISSUE_ID, isDefaultPublicIssue } from "@/lib/default-public-issue";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const venueId = searchParams.get("venueId") || searchParams.get("venue_id") || "";
  const issueId = searchParams.get("issueId") || "";

  const defaultPublicTarget = isDefaultPublicIssue(issueId) || (!issueId && !venueId);
  const defaultCampaigns = defaultPublicTarget
    ? await prisma.stalltalkCampaignHistory.findMany({
        where: { targetType: DEFAULT_PUBLIC_ISSUE_ID, publishStatus: "PUBLISHED", ad: { status: "ACTIVE" } },
        include: { ad: true },
        orderBy: [{ slotPublished: "asc" }, { publishedAt: "desc" }]
      })
    : [];
  const issue = defaultPublicTarget
    ? null
    : issueId
      ? await prisma.issue.findUnique({ where: { id: issueId }, include: { adSlots: { include: { ad: true }, orderBy: { slotNumber: "asc" } } } })
      : await prisma.issue.findFirst({
          where: { status: "PUBLISHED", ...(venueId ? { venueId } : {}) },
          orderBy: [{ year: "desc" }, { issueNumber: "desc" }],
          include: { adSlots: { include: { ad: true }, orderBy: { slotNumber: "asc" } } }
        });

  const ads = defaultPublicTarget
    ? defaultCampaigns.flatMap((campaign) => {
        const ad = campaign.ad;
        if (!ad || ad.status !== "ACTIVE" || !campaign.slotPublished) return [];
        return [{
          id: ad.id,
          name: ad.title,
          business_name: ad.businessName,
          headline: ad.generatedHeadline || ad.title,
          offer: ad.generatedSubheadline || ad.offer,
          cta: ad.ctaText,
          slot_id: "content-ad",
          placement: campaign.slotPublished,
          width: 600,
          height: 180,
          image_url: ad.artworkUrl,
          click_url: ad.targetUrl,
          status: "published",
          venue_id: null,
          created_at: ad.createdAt.toISOString(),
          updated_at: ad.updatedAt.toISOString(),
          published_at: (campaign.publishedAt || ad.updatedAt).toISOString()
        }];
      })
    : (issue?.adSlots || []).flatMap((slot) => {
        const ad = slot.ad;
        if (!ad || ad.status !== "ACTIVE") return [];
        return [{
          id: ad.id,
          name: ad.title,
          business_name: ad.businessName,
          headline: ad.generatedHeadline || ad.title,
          offer: ad.generatedSubheadline || ad.offer,
          cta: ad.ctaText,
          slot_id: "content-ad",
          placement: slot.slotNumber,
          width: 600,
          height: 180,
          image_url: ad.artworkUrl,
          click_url: ad.targetUrl,
          status: "published",
          venue_id: issue?.venueId,
          created_at: ad.createdAt.toISOString(),
          updated_at: ad.updatedAt.toISOString(),
          published_at: ad.updatedAt.toISOString()
        }];
      });

  return NextResponse.json(ads, { headers: { "Cache-Control": "no-store" } });
}
