import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

async function deleteCampaign(id: string, publishedOnly = false) {
  const campaign = await prisma.stalltalkCampaignHistory.findFirst({
    where: { OR: [{ campaignId: id }, { id }] },
  });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (publishedOnly && campaign.publishStatus !== "PUBLISHED") {
    return NextResponse.json({ error: "Published campaign not found" }, { status: 404 });
  }
  if (campaign.adId) {
    await prisma.ad.updateMany({ where: { id: campaign.adId }, data: { status: "ARCHIVED" } });
    await prisma.issueAdSlot.deleteMany({ where: { adId: campaign.adId } });
  }
  if (campaign.slotPublished) {
    await prisma.stalltalkAdSlot.updateMany({
      where: { slotNumber: campaign.slotPublished, ...(campaign.adId ? { adId: campaign.adId } : {}) },
      data: { adId: null },
    });
  }
  await prisma.stalltalkCampaignHistory.updateMany({
    where: { OR: [{ campaignId: id }, { id }] },
    data: { publishStatus: "DELETED", publishedToHomepage: false, slotPublished: null },
  });
  revalidatePath("/");
  revalidatePath("/issue");
  revalidatePath("/admin/ad-studio");
  revalidatePath("/admin/campaigns");
  revalidateTag("published-ads");
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const campaign = await prisma.stalltalkCampaignHistory.findFirst({ where: { OR: [{ campaignId: id }, { id }] } });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (user.role !== "ADMIN") {
    if (user.role !== "ADVERTISER" || !user.advertiserId || campaign.advertiserId !== user.advertiserId || campaign.publishStatus !== "DRAFT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }
  return deleteCampaign(id);
}
