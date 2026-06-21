import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultGlobalIssue } from "@/lib/default-global-issue";

function scheduledAtFrom(body: any) {
  if (!body.publishDate) return null;
  const time = body.publishTime || "00:00";
  return new Date(`${body.publishDate}T${time}:00`);
}

export async function GET() {
  await requireAdmin();
  const issue = await getDefaultGlobalIssue({ createIfMissing: true });
  const ads = await prisma.ad.findMany({ where: { status: "ACTIVE" }, orderBy: [{ businessName: "asc" }] });
  return NextResponse.json({ ok: true, issue, ads });
}

export async function PATCH(request: Request) {
  await requireAdmin();
  const body = await request.json();
  const issue = await getDefaultGlobalIssue({ createIfMissing: true });
  if (!issue) return NextResponse.json({ ok: false, error: "Default issue unavailable" }, { status: 404 });
  const blocks = body.blocks || [];
  const assignedTypes = blocks.map((block: any) => block.type).filter(Boolean);
  if (new Set(assignedTypes).size !== assignedTypes.length) return NextResponse.json({ ok: false, error: "Content type already assigned." }, { status: 400 });
  const layoutKeys = blocks.map((block: any) => block.layout?.key).filter(Boolean);
  if (new Set(layoutKeys).size !== layoutKeys.length) return NextResponse.json({ ok: false, error: "Content type already assigned." }, { status: 400 });
  const status = body.action === "publish" ? "PUBLISHED" : body.status;
  const scheduledAt = scheduledAtFrom(body);
  await prisma.issue.update({ where: { id: issue.id }, data: { title: body.title || "Potty Favor", month: body.month || "June", year: Number(body.year) || new Date().getFullYear(), status, scheduledAt, publishedAt: status === "PUBLISHED" ? new Date() : issue.publishedAt } });
  for (const block of blocks) {
    await prisma.issueContentBlock.upsert({
      where: { id: block.id || "missing" },
      update: { title: block.title || "Untitled", body: block.body || "", imageUrl: block.imageUrl || null, layout: block.layout || {} },
      create: { issueId: issue.id, type: block.type || "ARTICLE", title: block.title || "Untitled", body: block.body || "", imageUrl: block.imageUrl || null, layout: block.layout || {}, sortOrder: block.sortOrder || 99 },
    });
  }
  for (const [slot, adId] of Object.entries(body.slots || {})) {
    const slotNumber = Number(slot);
    if (!slotNumber) continue;
    if (!adId) await prisma.issueAdSlot.deleteMany({ where: { issueId: issue.id, slotNumber } });
    else {
      const ad = await prisma.ad.findUnique({ where: { id: String(adId) } });
      if (ad) await prisma.issueAdSlot.upsert({ where: { issueId_slotNumber: { issueId: issue.id, slotNumber } }, update: { adId: ad.id, source: ad.scope }, create: { issueId: issue.id, slotNumber, adId: ad.id, source: ad.scope } });
    }
  }
  revalidatePath("/issue");
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
