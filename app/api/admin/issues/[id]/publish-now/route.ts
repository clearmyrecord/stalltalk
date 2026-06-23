import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publishDueIssues } from "@/lib/issue-scheduling";
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(); const { id } = await params;
  await prisma.issue.update({ where: { id }, data: { isScheduled: true, isPublished: false, isArchived: false, scheduledPublishAt: new Date() } });
  return NextResponse.json({ ok: true, ...(await publishDueIssues()) });
}
