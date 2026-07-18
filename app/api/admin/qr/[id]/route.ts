import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const qr = await prisma.qrCode.findFirst({ where: { OR: [{ id }, { qrSlug: id }, { uuid: id }, { publicToken: id }] }, include: { _count: { select: { scans: true } } } });
  if (!qr) return NextResponse.json({ ok: false, error: "QR code not found" }, { status: 404 });
  if (qr._count.scans > 0) await prisma.qrCode.update({ where: { id: qr.id }, data: { status: "RETIRED", isActive: false } });
  else await prisma.qrCode.delete({ where: { id: qr.id } });
  return NextResponse.json({ ok: true, deactivated: qr._count.scans > 0 });
}
