import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolvePermanentQr } from "@/lib/permanent-qr-routing";

function ua(userAgent: string) {
  const mobile = /iPhone|Android|Mobile/i.test(userAgent);
  const tablet = /iPad|Tablet/i.test(userAgent);
  return { deviceType: tablet ? "tablet" : mobile ? "mobile" : "desktop", browser: /Chrome/i.test(userAgent) ? "Chrome" : /Safari/i.test(userAgent) ? "Safari" : /Firefox/i.test(userAgent) ? "Firefox" : "Other", operatingSystem: /iPhone|iPad/i.test(userAgent) ? "iOS" : /Android/i.test(userAgent) ? "Android" : /Mac/i.test(userAgent) ? "macOS" : /Windows/i.test(userAgent) ? "Windows" : "Other" };
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(request.url);
  const resolved = await resolvePermanentQr(slug);
  if (!resolved) return NextResponse.redirect(new URL("/issue", request.url));
  const parsed = ua(request.headers.get("user-agent") || "");
  const scanQr = resolved.placement || await prisma.qrCode.findFirst({ where: { venueId: resolved.venue.id, qrType: "VENUE", restroomId: null, isActive: true } });
  const visitorId = url.searchParams.get("visitor") || request.headers.get("x-vercel-id") || `${parsed.deviceType}-${Date.now()}`;
  const path = resolved.issue?.slug ? `/issue/${resolved.issue.slug}` : `/v/${resolved.venue.slug}`;
  const destination = new URL(path, request.url);
  destination.searchParams.set("qr", resolved.placement?.qrSlug || resolved.venue.publicToken || resolved.venue.slug);
  if (resolved.issue?.id) destination.searchParams.set("previewIssueId", resolved.issue.id);
  if (resolved.restroom?.id) destination.searchParams.set("restroom", resolved.restroom.id);
  await prisma.$transaction([
    ...(scanQr ? [prisma.qrScan.create({ data: { qrCodeId: scanQr.id, publisherId: scanQr.publisherId, venueId: resolved.venue.id, restroomId: resolved.restroom?.id || scanQr.restroomId, issueId: resolved.issue?.id, visitorId, sessionId: url.searchParams.get("session"), ...parsed, city: url.searchParams.get("city"), state: url.searchParams.get("state") || resolved.venue.state, country: url.searchParams.get("country") || "US", referralSource: request.headers.get("referer"), campaignSource: url.searchParams.get("utm_source") || scanQr.campaignSource, advertisementSource: url.searchParams.get("ad_source") || scanQr.advertisementSource, promotionSource: url.searchParams.get("promo_source") || scanQr.promotionSource, couponSource: url.searchParams.get("coupon_source") || scanQr.couponSource, metadata: { permanentRoute: `/q/${slug}`, resolvedPriority: "QR_RESTROOM_VENUE_EVERGREEN" } } }), prisma.qrCode.update({ where: { id: scanQr.id }, data: { lastScanAt: new Date(), status: ["DRAFT", "PRINTED"].includes(scanQr.status) ? "ACTIVE" : scanQr.status } })] : []),
    prisma.analyticsEvent.create({ data: { publisherId: resolved.placement?.publisherId || resolved.venue.publisherId, venueId: resolved.venue.id, restroomId: resolved.restroom?.id, qrCodeId: scanQr?.id, issueId: resolved.issue?.id, type: "SCAN", visitorId, path: `/q/${slug}`, metadata: { kind: resolved.kind, issueServed: resolved.issue?.id || null } } })
  ]);
  return NextResponse.redirect(destination);
}
