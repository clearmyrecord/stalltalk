import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { combinePublishDateTime } from "@/lib/issue-scheduling";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(); const { id } = await params; const body = await request.json().catch(() => ({}));
  const scheduledPublishAt = combinePublishDateTime(body.publishDate, body.publishTime) || (body.scheduledPublishAt ? new Date(body.scheduledPublishAt) : null);
  if (!scheduledPublishAt) return NextResponse.json({ ok: false, error: "Publish date/time required." }, { status: 400 });
  const issue = await prisma.issue.update({ where: { id }, data: { scheduledPublishAt, scheduledAt: scheduledPublishAt, timezone: body.timezone || "America/Los_Angeles", isScheduled: true, isPublished: false, isArchived: false, status: "SCHEDULED", replaceDefaultOnPublish: body.replaceDefaultOnPublish ?? true, archivePreviousOnPublish: body.archivePreviousOnPublish ?? true } });
  return NextResponse.json({ ok: true, issue });
}
