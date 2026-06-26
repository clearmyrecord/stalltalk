import type { Prisma, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const EMPTY_ANALYTICS_MESSAGE =
  "No analytics recorded yet. Data will appear after your published ads receive views or clicks.";

function pct(clicks: number, impressions: number) {
  return impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0;
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function deviceFromEvent(event: { metadata: Prisma.JsonValue }) {
  const metadata = event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata) ? event.metadata as Record<string, unknown> : {};
  const ua = String(metadata.userAgent || "");
  if (/iPad|Tablet/i.test(ua)) return "Tablet";
  if (/iPhone|Android|Mobile/i.test(ua)) return "Mobile";
  if (ua) return "Desktop";
  return "Unknown";
}

function increment(map: Record<string, number>, key: string, by = 1) {
  map[key] = (map[key] || 0) + by;
}

export async function advertiserIdForAnalytics(user: User) {
  return user.advertiserId;
}

export async function getAdvertiserAnalytics(advertiserId: string | null) {
  if (!advertiserId) {
    return { advertiserId: null, summary: { publishedAds: 0, totalImpressions: 0, totalClicks: 0, averageCtr: 0, qrAttributedViews: 0, conversions: 0 }, campaigns: [], timeline: [], empty: true };
  }

  const campaigns = await prisma.adCampaign.findMany({
    where: { advertiserId, OR: [{ publishedAt: { not: null } }, { status: "ACTIVE" }, { ad: { status: "ACTIVE" } }] },
    include: { advertiser: true, ad: true, inventory: { include: { venue: true } }, placements: { include: { inventory: { include: { venue: true } } } }, creatives: true },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
  });
  const adIds = [...new Set(campaigns.map((c) => c.adId).filter(Boolean) as string[])];
  const campaignIds = campaigns.map((c) => c.id);
  const campaignHistoryIds = campaigns.map((c) => c.id);

  const events = adIds.length || campaignIds.length
    ? await prisma.analyticsEvent.findMany({
        where: {
          OR: [
            { advertiserId },
            ...(adIds.length ? [{ adId: { in: adIds } }] : []),
            ...campaignIds.map((id) => ({ metadata: { path: ["campaignId"], equals: id } }) as any),
          ],
          type: { in: ["AD_IMPRESSION", "AD_CLICK", "COUPON_REDEMPTION", "COUPON_CLICK"] },
        },
        include: { qrCode: true, venue: true, issue: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const history = await prisma.stalltalkCampaignHistory.findMany({ where: { OR: [{ advertiserId }, { campaignId: { in: campaignHistoryIds } }, ...(adIds.length ? [{ adId: { in: adIds } }] : [])] } });

  const rows = campaigns.map((campaign) => {
    const campaignEvents = events.filter((event) => event.adId === campaign.adId || (event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata) && String((event.metadata as Record<string, unknown>).campaignId || "") === campaign.id));
    const impressions = campaignEvents.filter((e) => e.type === "AD_IMPRESSION").length || campaign.impressionsServed || campaign.ad?.viewCount || history.find((h) => h.adId === campaign.adId || h.campaignId === campaign.id)?.viewCount || 0;
    const clicks = campaignEvents.filter((e) => e.type === "AD_CLICK").length || campaign.clicksServed || campaign.ad?.clickCount || history.find((h) => h.adId === campaign.adId || h.campaignId === campaign.id)?.clickCount || 0;
    const qrScans = campaignEvents.filter((e) => e.qrCodeId).length || campaign.qrScans || 0;
    const lastClick = [...campaignEvents].reverse().find((e) => e.type === "AD_CLICK")?.createdAt || campaign.ad?.lastClickedAt || null;
    const placement = campaign.inventory || campaign.placements[0]?.inventory;
    const issueEvent = campaignEvents.find((e) => e.issue);
    const daily: Record<string, { date: string; impressions: number; clicks: number; ctr: number }> = {};
    const deviceBreakdown: Record<string, number> = {};
    const qrSourceBreakdown: Record<string, number> = {};
    for (const event of campaignEvents) {
      const key = dayKey(event.createdAt); daily[key] ||= { date: key, impressions: 0, clicks: 0, ctr: 0 };
      if (event.type === "AD_IMPRESSION") daily[key].impressions++;
      if (event.type === "AD_CLICK") daily[key].clicks++;
      increment(deviceBreakdown, deviceFromEvent(event));
      if (event.qrCode) increment(qrSourceBreakdown, event.qrCode.qrName || event.qrCode.qrSlug);
    }
    const dailyRows = Object.values(daily).map((d) => ({ ...d, ctr: pct(d.clicks, d.impressions) }));
    return { id: campaign.id, name: campaign.name, placement: placement ? `Slot ${placement.slotNumber} • ${placement.month}` : "Placement TBD", issue: issueEvent?.issue?.title || campaign.flightStartMonth, venue: placement?.venue.name || "Network", publishedDate: campaign.publishedAt?.toISOString() || null, impressions, clicks, ctr: pct(clicks, impressions), qrScans, lastClicked: lastClick?.toISOString() || null, status: campaign.status, imageUrl: campaign.creativeUrl || campaign.creatives[0]?.imageUrl || campaign.ad?.artworkUrl || null, metadata: { businessName: campaign.businessName, headline: campaign.headline, body: campaign.body, targetUrl: campaign.targetUrl }, creativeBrief: campaign.creativeBrief || campaign.description || campaign.creatives[0]?.body || "—", ctaText: campaign.ctaText || campaign.creatives[0]?.callToAction || null, couponCode: campaign.ad?.couponCode || null, daily: dailyRows, deviceBreakdown, qrSourceBreakdown };
  });
  const totalImpressions = rows.reduce((s, r) => s + r.impressions, 0);
  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
  const conversions = events.filter((e) => e.type === "COUPON_REDEMPTION" || e.type === "COUPON_CLICK").length;
  const timelineMap: Record<string, { date: string; impressions: number; clicks: number; ctr: number }> = {};
  rows.flatMap((r) => r.daily).forEach((d) => { timelineMap[d.date] ||= { date: d.date, impressions: 0, clicks: 0, ctr: 0 }; timelineMap[d.date].impressions += d.impressions; timelineMap[d.date].clicks += d.clicks; });
  const timeline = Object.values(timelineMap).map((d) => ({ ...d, ctr: pct(d.clicks, d.impressions) }));
  return { advertiserId, summary: { publishedAds: rows.length, totalImpressions, totalClicks, averageCtr: pct(totalClicks, totalImpressions), qrAttributedViews: rows.reduce((s, r) => s + r.qrScans, 0), conversions }, campaigns: rows, timeline, empty: totalImpressions + totalClicks + conversions === 0 };
}
