import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const campaign = await prisma.stalltalkCampaignHistory.findFirst({ where: { OR: [{ campaignId: id }, { id }], publishStatus: "PUBLISHED" } });
  if (!campaign) return NextResponse.json({ error: "Published campaign not found" }, { status: 404 });
  if (campaign.adId) {
    await prisma.ad.updateMany({ where: { id: campaign.adId }, data: { status: "ARCHIVED" } });
    await prisma.issueAdSlot.deleteMany({ where: { adId: campaign.adId } });
  }
  if (campaign.slotPublished) await prisma.stalltalkAdSlot.updateMany({ where: { slotNumber: campaign.slotPublished, ...(campaign.adId ? { adId: campaign.adId } : {}) }, data: { adId: null } });
  await prisma.stalltalkCampaignHistory.update({ where: { campaignId: campaign.campaignId }, data: { publishStatus: "DELETED", publishedToHomepage: false, slotPublished: null } });
  revalidatePath("/"); revalidatePath("/issue"); revalidatePath("/admin/ad-studio"); revalidatePath("/admin/campaigns"); revalidateTag("published-ads");
  return NextResponse.json({ ok: true });
}
