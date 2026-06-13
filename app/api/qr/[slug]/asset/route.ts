import { NextResponse } from "next/server";
import { qrStickerSvg } from "@/lib/qr";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const format = new URL(request.url).searchParams.get("format") || "svg";
  const qr = await prisma.qrCode.findUnique({ where: { qrSlug: slug }, include: { venue: true } });
  if (!qr) return NextResponse.json({ error: "QR code not found" }, { status: 404 });
  const svg = qrStickerSvg({ value: qr.qrUrl, venueName: qr.venue?.name || "Potty Favor", shortUrl: qr.shortUrl || `/q/${qr.qrSlug}`, callToAction: qr.callToAction, template: qr.stickerTemplate });
  if (format === "pdf") return new NextResponse(`%PDF-1.3\n% Potty Favor print-ready sticker placeholder\n${svg}\n%%EOF`, { headers: { "content-type": "application/pdf" } });
  if (format === "png") return new NextResponse(svg, { headers: { "content-type": "image/svg+xml", "content-disposition": `attachment; filename=${slug}.png` } });
  return new NextResponse(svg, { headers: { "content-type": "image/svg+xml" } });
}
