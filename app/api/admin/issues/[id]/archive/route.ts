import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) { await requireAdmin(); const { id } = await params; const issue = await prisma.issue.update({ where: { id }, data: { status: "ARCHIVED", isArchived: true, isScheduled: false, archivedAt: new Date() } }); return NextResponse.json({ ok: true, issue }); }
