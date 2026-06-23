import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { issueSlug, nextMonthYear } from "@/lib/issue-scheduling";
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(); const { id } = await params;
  const source = await prisma.issue.findUniqueOrThrow({ where: { id }, include: { venue: true, contentBlocks: true, adSlots: true } });
  const next = nextMonthYear(source.month, source.year);
  const clone = await prisma.issue.create({ data: { publisherId: source.publisherId, venueId: source.venueId, restroomId: source.restroomId, qrCodeId: null, title: `${source.venue?.name ? `${source.venue.name} ` : ""}${next.month} ${next.year}`, slug: issueSlug(source.venue?.slug, next.month, next.year), month: next.month, year: next.year, issueNumber: source.issueNumber + 1, status: "DRAFT", scheduledAt: null, scheduledPublishAt: null, timezone: source.timezone || "America/Los_Angeles", isScheduled: false, isPublished: false, isArchived: false, replaceDefaultOnPublish: true, archivePreviousOnPublish: true, contentBlocks: { create: source.contentBlocks.map((block) => ({ articleId: block.articleId, type: block.type, title: block.title, body: block.body, imageUrl: block.imageUrl, venueIds: block.venueIds, sortOrder: block.sortOrder, startsAt: block.startsAt, endsAt: block.endsAt, layout: { ...((block.layout as any) || {}), sponsorRefresh: "Needs Refresh" } })) }, adSlots: { create: source.adSlots.map((slot) => ({ adId: slot.adId, slotNumber: slot.slotNumber, source: slot.source })) } } });
  return NextResponse.json({ ok: true, issueId: clone.id, editUrl: `/admin/issues/${clone.id}/edit` });
}
