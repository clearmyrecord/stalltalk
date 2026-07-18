import { NextResponse } from "next/server";
import { normalizeQrUrl, qrPngBuffer, qrStickerSvg, qrSvg } from "@/lib/qr";
import { prisma } from "@/lib/prisma";
import { validatedPermanentQrAssetUrl } from "@/lib/qr-asset-routing";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const searchParams = new URL(request.url).searchParams;
  const format = searchParams.get("format") || "svg";
  const qr = await prisma.qrCode.findUnique({ where: { qrSlug: slug }, include: { venue: true } });
  if (!qr) return NextResponse.json({ error: "QR code not found" }, { status: 404 });
  const requestedPermanentRoute = searchParams.get("route");
  const encodedUrl = requestedPermanentRoute
    ? validatedPermanentQrAssetUrl(requestedPermanentRoute)
    : normalizeQrUrl(qr.qrSlug, qr.qrUrl);
  if (!encodedUrl) return NextResponse.json({ error: "Invalid permanent QR route" }, { status: 400 });

  if (format === "png") {
    const png = await qrPngBuffer(encodedUrl);
    return new NextResponse(new Uint8Array(png), { headers: { "content-type": "image/png", "content-disposition": `attachment; filename=${slug}-qr-1024.png` } });
  }

  const svg = format === "sticker" || format === "pdf"
    ? qrStickerSvg({ value: encodedUrl, venueName: qr.venue?.name || "Potty Favor", shortUrl: encodedUrl, callToAction: qr.callToAction, template: qr.stickerTemplate })
    : qrSvg(encodedUrl);

  if (format === "pdf") return new NextResponse(svg, { headers: { "content-type": "image/svg+xml", "content-disposition": `attachment; filename=${slug}-sticker.svg` } });
  return new NextResponse(svg, { headers: { "content-type": "image/svg+xml", "content-disposition": format === "svg" ? `attachment; filename=${slug}-qr.svg` : `attachment; filename=${slug}-sticker.svg` } });
}
