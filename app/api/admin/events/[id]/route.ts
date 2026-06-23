import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function julyIssueId() {
  const issue = await prisma.issue.findFirst({ where: { month: "July", year: 2026 }, select: { id: true } });
  return issue?.id || null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const body = await request.json();
  const status = body.status as "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "HIDDEN" | "PUBLISHED" | undefined;
  const issueId = status === "APPROVED" || status === "PUBLISHED" ? await julyIssueId() : undefined;
  const event = await prisma.event.update({ where: { id }, data: { ...body, ...(issueId ? { issueId } : {}), status } });
  return NextResponse.json({ ok: true, event });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  await prisma.event.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
