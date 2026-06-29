import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { restroomLabelSelect } from "@/lib/restroom-schema";

function ua(userAgent: string) {
  const mobile = /iPhone|Android|Mobile/i.test(userAgent);
  const tablet = /iPad|Tablet/i.test(userAgent);
  return {
    deviceType: tablet ? "tablet" : mobile ? "mobile" : "desktop",
    browser: /Chrome/i.test(userAgent) ? "Chrome" : /Safari/i.test(userAgent) ? "Safari" : /Firefox/i.test(userAgent) ? "Firefox" : "Other",
    operatingSystem: /iPhone|iPad/i.test(userAgent) ? "iOS" : /Android/i.test(userAgent) ? "Android" : /Mac/i.test(userAgent) ? "macOS" : /Windows/i.test(userAgent) ? "Windows" : "Other"
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(request.url);
  const qr = await prisma.qrCode.findUnique({ where: { qrSlug: slug }, include: { venue: true, restroom: { select: restroomLabelSelect } } });
  if (!qr) return NextResponse.json({ error: "QR code not found" }, { status: 404 });
  const userAgent = request.headers.get("user-agent") || "";
  const parsed = ua(userAgent);
  const visitorId = url.searchParams.get("visitor") || request.headers.get("x-vercel-id") || `${parsed.deviceType}-${Date.now()}`;
  await prisma.$transaction([
    prisma.qrScan.create({ data: { qrCodeId: qr.id, publisherId: qr.publisherId, venueId: qr.venueId, restroomId: qr.restroomId, visitorId, sessionId: url.searchParams.get("session"), ...parsed, city: url.searchParams.get("city"), state: url.searchParams.get("state") || qr.venue?.state, country: url.searchParams.get("country") || "US", referralSource: request.headers.get("referer"), campaignSource: url.searchParams.get("utm_source") || qr.campaignSource, advertisementSource: url.searchParams.get("ad_source") || qr.advertisementSource, promotionSource: url.searchParams.get("promo_source") || qr.promotionSource, couponSource: url.searchParams.get("coupon_source") || qr.couponSource, metadata: { url: request.url } } }),
    prisma.analyticsEvent.create({ data: { publisherId: qr.publisherId, venueId: qr.venueId, restroomId: qr.restroomId, qrCodeId: qr.id, type: "SCAN", visitorId, path: qr.qrUrl, metadata: { campaignSource: qr.campaignSource, advertisementSource: qr.advertisementSource, promotionSource: qr.promotionSource, couponSource: qr.couponSource } } }),
    prisma.qrCode.update({ where: { id: qr.id }, data: { lastScanAt: new Date(), status: qr.status === "DRAFT" || qr.status === "PRINTED" ? "ACTIVE" : qr.status } })
  ]);
  const issue = qr.venueId ? await prisma.issue.findFirst({ where: { venueId: qr.venueId, ...(qr.restroomId ? { restroomId: qr.restroomId } : {}), status: "PUBLISHED", isPublished: true, isArchived: false }, orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }] }) : null;
  const baseDestination = qr.destinationUrl || qr.qrUrl || (qr.venue?.slug ? `/v/${qr.venue.slug}` : "/issue");
  const destination = new URL(baseDestination, request.url);
  destination.searchParams.set("qr", qr.qrSlug);
  if (qr.restroomId) destination.searchParams.set("restroom", qr.restroomId);
  if (issue) destination.searchParams.set("previewIssueId", issue.id);
  return NextResponse.redirect(destination);
}
