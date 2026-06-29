import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { restroomLabelSelect } from "@/lib/restroom-schema";
import { sponsorPlacementLabel, sponsorPlacementSection } from "@/lib/sponsor-placements";

function parseUa(userAgent: string) {
  const mobile = /iPhone|Android|Mobile/i.test(userAgent);
  const tablet = /iPad|Tablet/i.test(userAgent);
  return {
    deviceType: tablet ? "tablet" : mobile ? "mobile" : "desktop",
    browser: /Chrome/i.test(userAgent) ? "Chrome" : /Safari/i.test(userAgent) ? "Safari" : /Firefox/i.test(userAgent) ? "Firefox" : "Other",
    operatingSystem: /iPhone|iPad/i.test(userAgent) ? "iOS" : /Android/i.test(userAgent) ? "Android" : /Mac/i.test(userAgent) ? "macOS" : /Windows/i.test(userAgent) ? "Windows" : "Other",
  };
}

function ipHash(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
  return ip ? createHash("sha256").update(ip).digest("hex") : null;
}

function requestIds(request: Request) {
  const url = new URL(request.url);
  return {
    visitorId: url.searchParams.get("visitor") || request.headers.get("x-vercel-id") || request.headers.get("x-stalltalk-visitor"),
    sessionId: url.searchParams.get("session") || request.headers.get("x-stalltalk-session"),
  };
}

export async function findQrRecord(code: string) {
  return prisma.qrCode.findFirst({
    where: { OR: [{ id: code }, { uuid: code }, { qrSlug: code }] },
    include: { venue: true, restroom: { select: restroomLabelSelect } },
  });
}

export async function recordQrScan({ code, request, source }: { code: string; request: Request; source: "qr-route" | "issue-query" }) {
  const qr = await findQrRecord(code);
  if (!qr) return null;
  const url = new URL(request.url);
  const userAgent = request.headers.get("user-agent") || "";
  const ids = requestIds(request);
  const visitorId = ids.visitorId || `${parseUa(userAgent).deviceType}-${Date.now()}`;
  const metadata = { source, url: request.url, userAgent, ipHash: ipHash(request), qrCode: code, inactive: !["DEPLOYED", "ACTIVE"].includes(qr.status) };
  const parsed = parseUa(userAgent);
  await prisma.$transaction([
    prisma.qrScan.create({ data: { qrCodeId: qr.id, publisherId: qr.publisherId, venueId: qr.venueId, restroomId: qr.restroomId, visitorId, sessionId: ids.sessionId, ...parsed, city: url.searchParams.get("city"), state: url.searchParams.get("state") || qr.venue?.state, country: url.searchParams.get("country") || "US", referralSource: request.headers.get("referer"), campaignSource: url.searchParams.get("utm_source") || qr.campaignSource, advertisementSource: url.searchParams.get("ad_source") || qr.advertisementSource, promotionSource: url.searchParams.get("promo_source") || qr.promotionSource, couponSource: url.searchParams.get("coupon_source") || qr.couponSource, metadata } }),
    prisma.analyticsEvent.create({ data: { publisherId: qr.publisherId, venueId: qr.venueId, restroomId: qr.restroomId, qrCodeId: qr.id, type: "SCAN", visitorId, sessionId: ids.sessionId, path: url.pathname + url.search, metadata } }),
    prisma.qrCode.update({ where: { id: qr.id }, data: { lastScanAt: new Date(), status: qr.status === "DRAFT" || qr.status === "PRINTED" ? "ACTIVE" : qr.status } }),
  ]);
  return qr;
}

export async function recordAdImpression({ adId, slotNumber, qrCode, campaignId, venueId, issueId, request }: { adId?: string | null; slotNumber?: number | null; qrCode?: string | null; campaignId?: string | null; venueId?: string | null; issueId?: string | null; request: Request }) {
  if (!adId && !campaignId) return;
  const qr = qrCode ? await findQrRecord(qrCode).catch(() => null) : null;
  const userAgent = request.headers.get("user-agent") || "";
  const ids = requestIds(request);
  const metadata = { qrCode, campaignId, sponsorPlacement: sponsorPlacementLabel(slotNumber), section: sponsorPlacementSection(slotNumber), metric: "impression", userAgent, ipHash: ipHash(request) };
  await prisma.$transaction([
    ...(adId ? [prisma.ad.update({ where: { id: adId }, data: { viewCount: { increment: 1 }, lastViewedAt: new Date() } })] : []),
    ...(campaignId ? [prisma.stalltalkCampaignHistory.updateMany({ where: { OR: [{ id: campaignId }, { campaignId }] }, data: { viewCount: { increment: 1 }, lastViewedAt: new Date() } })] : []),
    prisma.analyticsEvent.create({ data: { adId: adId || undefined, venueId: venueId || qr?.venueId, restroomId: qr?.restroomId, qrCodeId: qr?.id, issueId: issueId || undefined, type: "AD_IMPRESSION", slotNumber, visitorId: ids.visitorId, sessionId: ids.sessionId, path: new URL(request.url).pathname + new URL(request.url).search, metadata } }),
  ]);
}

export async function recordAdClick({ adId, slotNumber, qrCode, targetUrl, request }: { adId: string; slotNumber?: number | null; qrCode?: string | null; targetUrl?: string | null; request: Request }) {
  const ad = await prisma.ad.findUnique({ where: { id: adId }, include: { campaignHistory: true } });
  const qr = qrCode ? await findQrRecord(qrCode).catch(() => null) : null;
  const userAgent = request.headers.get("user-agent") || "";
  const ids = requestIds(request);
  const metadata = { qrCode, targetUrl, sponsorPlacement: sponsorPlacementLabel(slotNumber), section: sponsorPlacementSection(slotNumber), metric: "click", userAgent, ipHash: ipHash(request) };
  if (ad) {
    await prisma.$transaction([
      prisma.ad.update({ where: { id: adId }, data: { clickCount: { increment: 1 }, lastClickedAt: new Date() } }),
      prisma.stalltalkCampaignHistory.updateMany({ where: { adId }, data: { clickCount: { increment: 1 }, lastClickedAt: new Date() } }),
      prisma.analyticsEvent.create({ data: { publisherId: ad.publisherId, advertiserId: ad.advertiserId, adId, venueId: qr?.venueId || ad.venueId, restroomId: qr?.restroomId || ad.restroomId, qrCodeId: qr?.id, type: "AD_CLICK", slotNumber, visitorId: ids.visitorId, sessionId: ids.sessionId, path: new URL(request.url).pathname + new URL(request.url).search, metadata } }),
    ]);
  }
}
