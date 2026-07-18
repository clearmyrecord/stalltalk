import { prisma } from "./prisma";
import { scheduledTargetWhere, targetOrderBy } from "./venue-issue-schedule";

type Db = typeof prisma | any;

export type EditorialSource = "PUBLIC_NETWORK" | "VENUE" | null;
export type ResolvedEditorial = { issue: any | null; source: EditorialSource; reason: string; priority: string };

function activationTime(issue: any): Date | null {
  if (issue?.isScheduled || issue?.status === "SCHEDULED") return issue.scheduledPublishAt || issue.publishedAt || null;
  return issue?.publishedAt || null;
}

function qualifies(issue: any, now: Date) {
  if (!issue || !issue.isPublished || issue.isArchived || !["PUBLISHED", "SCHEDULED"].includes(issue.status)) return false;
  const activeAt = activationTime(issue);
  return Boolean(activeAt && activeAt <= now);
}

function byActivationDescThenId(a: any, b: any) {
  return (activationTime(b)?.getTime() || 0) - (activationTime(a)?.getTime() || 0) || String(b.id).localeCompare(String(a.id));
}

async function qualifyingIssueFindFirst(db: Db, where: any, now: Date) {
  const queryWhere = {
    ...where,
    status: { in: ["PUBLISHED", "SCHEDULED"] },
    isPublished: true,
    isArchived: false,
    OR: [
      { isScheduled: true, scheduledPublishAt: { lte: now } },
      { status: "SCHEDULED", scheduledPublishAt: { lte: now } },
      { isScheduled: false, status: "PUBLISHED", publishedAt: { lte: now } },
    ],
  };
  if (db.issue.findMany) {
    const rows = await db.issue.findMany({ where: queryWhere, orderBy: [{ scheduledPublishAt: "desc" as const }, { publishedAt: "desc" as const }, { id: "desc" as const }], take: 20 });
    return rows.filter((issue: any) => qualifies(issue, now)).sort(byActivationDescThenId)[0] || null;
  }
  const row = await db.issue.findFirst({ where: queryWhere, orderBy: [{ scheduledPublishAt: "desc" as const }, { publishedAt: "desc" as const }, { id: "desc" as const }] });
  return qualifies(row, now) ? row : null;
}

function sourceOf(issue: any | null): EditorialSource {
  if (!issue) return null;
  return issue.editorialScope === "PUBLIC_NETWORK" || issue.isGlobalIssue || !issue.venueId ? "PUBLIC_NETWORK" : "VENUE";
}

async function targetedIssue(where: any, db: Db, now: Date): Promise<any | null> {
  const row = await db.issueTarget.findFirst({ where: { ...where, ...scheduledTargetWhere(now) }, include: { issue: true }, orderBy: targetOrderBy() });
  return row?.issue || null;
}

export async function resolvePublicIssue(db: Db = prisma, now = new Date()) {
  return qualifyingIssueFindFirst(db, { editorialScope: "PUBLIC_NETWORK" }, now);
}

export async function resolveVenueCustomIssue(venueId: string, db: Db = prisma, now = new Date()) {
  const targeted = await targetedIssue({ venueId, targetType: "VENUE" }, db, now);
  if (targeted) return targeted;
  return qualifyingIssueFindFirst(db, { venueId, editorialScope: "VENUE", restroomId: null }, now);
}

export async function resolveVenueEditorial(venue: { id: string; contentMode?: "PUBLIC" | "VENUE_CUSTOM" | string | null }, db: Db = prisma, now = new Date()): Promise<ResolvedEditorial> {
  if (venue.contentMode === "VENUE_CUSTOM") {
    const custom = await resolveVenueCustomIssue(venue.id, db, now);
    if (custom) return { issue: custom, source: sourceOf(custom), reason: "Venue is set to My Venue Issue and a venue issue is currently live.", priority: "VENUE_CUSTOM" };
    const fallback = await resolvePublicIssue(db, now);
    return { issue: fallback, source: sourceOf(fallback), reason: fallback ? "Venue is set to My Venue Issue, but no venue issue is live, so the Potty Favor public issue is displayed." : "No venue or public issue is currently live.", priority: fallback ? "PUBLIC_FALLBACK" : "EVERGREEN" };
  }
  const pub = await resolvePublicIssue(db, now);
  return { issue: pub, source: sourceOf(pub), reason: pub ? "Venue is set to Potty Favor Public Issue." : "No Potty Favor public issue is currently live.", priority: pub ? "PUBLIC" : "EVERGREEN" };
}

export async function resolveNextScheduledIssue(venueId: string | null | undefined, db: Db = prisma, now = new Date(), scope?: "PUBLIC_NETWORK" | "VENUE") {
  return db.issue.findFirst({
    where: { ...(venueId ? { venueId } : {}), ...(scope ? { editorialScope: scope } : {}), status: "SCHEDULED", isPublished: true, isArchived: false, scheduledPublishAt: { gt: now } },
    orderBy: [{ scheduledPublishAt: "asc" as const }, { id: "asc" as const }],
  });
}

export function resolvedIssueId(resolved: ResolvedEditorial) {
  return resolved.issue?.id || null;
}
