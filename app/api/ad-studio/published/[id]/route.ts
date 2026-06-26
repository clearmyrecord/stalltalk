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

  await prisma.$transaction(async (tx) => {
    if (campaign.adId) {
      await tx.ad.updateMany({ where: { id: campaign.adId }, data: { status: "PAUSED" } });
      await tx.issueAdSlot.deleteMany({ where: { adId: campaign.adId } });
      await tx.stalltalkAdSlot.updateMany({ where: { adId: campaign.adId }, data: { adId: null } });
    }
    if (campaign.slotPublished) await tx.stalltalkAdSlot.updateMany({ where: { slotNumber: campaign.slotPublished, ...(campaign.adId ? { adId: campaign.adId } : {}) }, data: { adId: null } });
    await tx.stalltalkCampaignHistory.updateMany({ where: { OR: [{ campaignId: id }, { id }] }, data: { publishStatus: "UNPUBLISHED", publishedToHomepage: false, slotPublished: null } });
  });

  revalidatePath("/"); revalidatePath("/issue"); revalidatePath("/admin/ad-studio"); revalidatePath("/admin/campaigns"); revalidateTag("published-ads");
  return NextResponse.json({ ok: true });
}
