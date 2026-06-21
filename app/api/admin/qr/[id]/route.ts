import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const qr = await prisma.qrCode.findFirst({ where: { OR: [{ id }, { qrSlug: id }, { uuid: id }] } });
  if (!qr) return NextResponse.json({ ok: false, error: "QR code not found" }, { status: 404 });
  if (["DRAFT", "PRINTED", "DEPLOYED", "ACTIVE", "RETIRED"].includes(qr.status)) {
    await prisma.qrCode.update({ where: { id: qr.id }, data: { status: "RETIRED" } });
  } else {
    await prisma.qrCode.delete({ where: { id: qr.id } });
  }
  return NextResponse.json({ ok: true });
}
