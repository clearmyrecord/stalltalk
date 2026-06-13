import type { Ad, AdScope, Issue, IssueAdSlot, Restroom, Venue } from "@prisma/client";
import { prisma } from "./prisma";

type Context = Issue & { venue: Venue | null; restroom: Restroom | null; adSlots?: Array<IssueAdSlot & { ad: Ad }> };
export type ServedAd = (Ad & { source: AdScope; slotNumber: number }) | null;

export async function getServedAds(issue: Context): Promise<ServedAd[]> {
  const now = new Date();
  const activeManualSlots = new Map(
    (issue.adSlots || [])
      .filter((slot) => isActive(slot.ad, now) && matchesScope(slot.ad, issue, slot.ad.scope))
      .map((slot) => [slot.slotNumber, { ...slot.ad, source: slot.source || slot.ad.scope, slotNumber: slot.slotNumber }])
  );
  const ads = await prisma.ad.findMany({
    where: {
      publisherId: issue.publisherId,
      status: "ACTIVE",
      OR: [{ campaignStartsAt: null }, { campaignStartsAt: { lte: now } }],
      AND: [{ OR: [{ campaignEndsAt: null }, { campaignEndsAt: { gte: now } }] }]
    },
    orderBy: [{ scope: "desc" }, { createdAt: "asc" }]
  });

  const priority: AdScope[] = ["RESTROOM", "VENUE", "CITY", "GLOBAL"];
  const scoped = priority.flatMap((scope) => ads.filter((ad) => matchesScope(ad, issue, scope)).map((ad) => ({ ...ad, source: scope })));
  const deduped = scoped.filter((ad, index, list) => list.findIndex((candidate) => candidate.id === ad.id) === index);
  let rotationIndex = 0;

  return Array.from({ length: 8 }, (_, index) => {
    const slotNumber = index + 1;
    const manual = activeManualSlots.get(slotNumber);
    if (manual) return manual;
    if (!deduped.length) return null;
    const ad = deduped[rotationIndex % deduped.length];
    rotationIndex += 1;
    return { ...ad, slotNumber };
  }) as ServedAd[];
}

function isActive(ad: Ad, now: Date) {
  return ad.status === "ACTIVE" && (!ad.campaignStartsAt || ad.campaignStartsAt <= now) && (!ad.campaignEndsAt || ad.campaignEndsAt >= now);
}

function matchesScope(ad: Ad, issue: Context, scope: AdScope) {
  if (ad.scope !== scope) return false;
  if (scope === "RESTROOM") return Boolean(issue.restroomId && ad.restroomId === issue.restroomId);
  if (scope === "VENUE") return ad.venueId === issue.venueId || Boolean(issue.venueId && ad.venueIds.includes(issue.venueId));
  if (scope === "CITY") return Boolean(issue.venue && ad.city === issue.venue.city && ad.state === issue.venue.state);
  return scope === "GLOBAL";
}
