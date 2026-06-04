import type { Ad, AdScope, Issue, Restroom, Venue } from "@prisma/client";
import { prisma } from "./prisma";

type Context = Issue & { venue: Venue; restroom: Restroom | null };
type ServedAd = Ad & { source: AdScope; slotNumber: number };

export async function getServedAds(issue: Context): Promise<ServedAd[]> {
  const now = new Date();
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
  if (!deduped.length) return [];
  return Array.from({ length: 8 }, (_, index) => ({ ...deduped[index % deduped.length], slotNumber: index + 1 })) as ServedAd[];
}

function matchesScope(ad: Ad, issue: Context, scope: AdScope) {
  if (ad.scope !== scope) return false;
  if (scope === "RESTROOM") return Boolean(issue.restroomId && ad.restroomId === issue.restroomId);
  if (scope === "VENUE") return ad.venueId === issue.venueId;
  if (scope === "CITY") return ad.city === issue.venue.city && ad.state === issue.venue.state;
  return scope === "GLOBAL";
}
