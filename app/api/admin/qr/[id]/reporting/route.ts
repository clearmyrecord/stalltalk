import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getQrReporting, parseReportingRange } from "@/lib/qrReporting";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const qr = await prisma.qrCode.findFirst({ where: { OR: [{ id }, { qrSlug: id }, { uuid: id }] } });
  if (!qr) return NextResponse.json({ ok: false, error: "QR code not found" }, { status: 404 });
  const { searchParams } = new URL(request.url);
  return NextResponse.json(await getQrReporting(parseReportingRange(searchParams.get("range"), searchParams.get("from"), searchParams.get("to")), qr.id));
}
