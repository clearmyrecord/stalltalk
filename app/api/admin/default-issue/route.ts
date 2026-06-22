import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultIssue, saveDefaultIssue } from "@/lib/default-issue";

export async function GET() {
  await requireAdmin();
  const issue = await getDefaultIssue({ createIfMissing: true });
  const ads = await prisma.ad.findMany({ where: { status: "ACTIVE" }, orderBy: [{ businessName: "asc" }] });
  return NextResponse.json({ ok: true, issue, ads });
}

export async function PATCH(request: Request) {
  await requireAdmin();
  const body = await request.json();
  const assignedTypes = (body.blocks || []).map((block: any) => block.type).filter(Boolean);
  if (new Set(assignedTypes).size !== assignedTypes.length) return NextResponse.json({ ok: false, error: "Content type already assigned." }, { status: 400 });
  const layoutKeys = (body.blocks || []).map((block: any) => block.layout?.key).filter(Boolean);
  if (new Set(layoutKeys).size !== layoutKeys.length) return NextResponse.json({ ok: false, error: "Content type already assigned." }, { status: 400 });
  const current = await getDefaultIssue({ createIfMissing: true });
  const adSlots = Object.entries(body.slots || {}).map(([slot, adId]) => ({ id: `${current?.id || "global"}-slot-${slot}`, slotNumber: Number(slot), adId: adId ? String(adId) : null, source: "GLOBAL", ad: null }));
  const issue = await saveDefaultIssue({ ...(current || {}), ...body, status: body.action === "publish" ? "PUBLISHED" : body.status, contentBlocks: body.blocks || body.contentBlocks || [], adSlots });
  revalidatePath("/issue");
  revalidatePath("/");
  revalidatePath("/admin/default-issue");
  revalidatePath("/admin/issue-builder");
  return NextResponse.json({ ok: true, issue });
}

export const PUT = PATCH;
