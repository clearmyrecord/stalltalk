import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findBestCampaign, parseUserAgent } from "@/lib/potty-favor-routing";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const qrId = decodeURIComponent(slug).toUpperCase();
  const asset = await prisma.pottyFavorQrAsset.findUnique({ where: { qrId } });

  if (!asset || asset.status !== "ACTIVE") {
    return NextResponse.redirect(new URL("/issue", request.url));
  }

  const campaign = await findBestCampaign(asset);
  const userAgent = request.headers.get("user-agent") || "";
  const parsed = parseUserAgent(userAgent);

  await prisma.$transaction([
    prisma.pottyFavorScanAnalytics.create({
      data: {
        qrId: asset.qrId,
        campaignId: campaign?.id || null,
        venueSlug: asset.venueSlug,
        zip: asset.zip,
        city: asset.city,
        state: asset.state,
        userAgent,
        referrer: request.headers.get("referer"),
        ...parsed
      }
    }),
    prisma.pottyFavorQrAsset.update({ where: { id: asset.id }, data: { currentCampaignId: campaign?.id || asset.currentCampaignId } })
  ]);

  return NextResponse.redirect(new URL(campaign?.destinationUrl || "/issue", request.url));
}
