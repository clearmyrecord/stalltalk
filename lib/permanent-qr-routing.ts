import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { scheduledTargetWhere, targetOrderBy } from "./venue-issue-schedule";
import { resolvePublicIssue, resolveVenueEditorial, type ResolvedEditorial } from "./editorial-resolution";

const liveIssue = { status: { in: ["PUBLISHED", "SCHEDULED"] }, isPublished: true, isArchived: false } as const;

type Db = typeof prisma | any;

export async function resolvePermanentQr(token: string, db: Db = prisma, now = new Date()) {
  const placement = await db.qrCode.findFirst({ where: { OR: [{ publicToken: token }, { qrSlug: token }, { slug: token }], isActive: true }, include: { venue: true, restroom: true } });
  if (placement?.venueId) {
    const resolved = await issueForPlacement(placement, db, now);
    return { kind: "placement" as const, placement, venue: placement.venue, restroom: placement.restroom, issue: resolved.issue, editorialSource: resolved.source, resolutionReason: resolved.reason, resolvedPriority: resolved.priority };
  }
  const venue = await db.venue.findFirst({ where: { OR: [{ publicToken: token }, { slug: token }], isActive: true } });
  if (!venue) return null;
  const resolved = await resolveVenueEditorial(venue, db, now);
  return { kind: "venue" as const, placement: null, venue, restroom: null, issue: resolved.issue, editorialSource: resolved.source, resolutionReason: resolved.reason, resolvedPriority: resolved.priority };
}

async function issueForPlacement(qr: { id: string; venueId: string | null; restroomId: string | null; venue?: any }, db: Db, now: Date): Promise<ResolvedEditorial> {
  const direct = await db.issueTarget.findFirst({ where: { qrCodeId: qr.id, targetType: "QR_PLACEMENT", ...scheduledTargetWhere(now) }, include: { issue: true }, orderBy: targetOrderBy() });
  if (direct?.issue) return { issue: direct.issue, source: direct.issue.editorialScope === "PUBLIC_NETWORK" ? "PUBLIC_NETWORK" : "VENUE", reason: "A live issue is targeted directly to this QR placement.", priority: "QR_PLACEMENT" };
  if (qr.restroomId) {
    const restroom = await db.issueTarget.findFirst({ where: { restroomId: qr.restroomId, targetType: "RESTROOM", ...scheduledTargetWhere(now) }, include: { issue: true }, orderBy: targetOrderBy() });
    if (restroom?.issue) return { issue: restroom.issue, source: restroom.issue.editorialScope === "PUBLIC_NETWORK" ? "PUBLIC_NETWORK" : "VENUE", reason: "A live issue is targeted to this restroom.", priority: "RESTROOM" };
  }
  if (!qr.venueId) return { issue: null, source: null, reason: "QR is not linked to a venue.", priority: "EVERGREEN" };
  if (qr.restroomId) {
    const legacyRestroom = await db.issue.findFirst({ where: { venueId: qr.venueId, restroomId: qr.restroomId, editorialScope: "VENUE", ...liveIssue, publishedAt: { lte: now } }, orderBy: [{ publishedAt: "desc" }, { id: "desc" }] });
    if (legacyRestroom) return { issue: legacyRestroom, source: "VENUE", reason: "Legacy restroom issue is live for this QR restroom.", priority: "RESTROOM_LEGACY" };
  }
  const venue = qr.venue || await db.venue.findFirst({ where: { id: qr.venueId, isActive: true } });
  return venue ? resolveVenueEditorial(venue, db, now) : { issue: await resolvePublicIssue(db, now), source: "PUBLIC_NETWORK", reason: "QR venue was unavailable, so public issue fallback was used.", priority: "PUBLIC_FALLBACK" };
}

export async function publishIssueTargets(issueId: string, targets: { venueId?: string | null; restroomIds: string[]; qrCodeIds: string[]; publishAt?: Date | null; unpublishAt?: Date | null; cancelExisting?: boolean }, db: Db = prisma) {
  const issue = await db.issue.findUnique({ where: { id: issueId }, select: { id: true, venueId: true, publisherId: true, editorialScope: true } });
  if (!issue) throw new Error("Issue not found.");
  const qrCodes = targets.qrCodeIds.length ? await db.qrCode.findMany({ where: { id: { in: targets.qrCodeIds } }, select: { id: true, venueId: true, restroomId: true } }) : [];
  const restrooms = targets.restroomIds.length ? await db.restroom.findMany({ where: { id: { in: targets.restroomIds } }, select: { id: true, venueId: true } }) : [];
  const venueId = targets.venueId || issue.venueId || restrooms[0]?.venueId || qrCodes[0]?.venueId;
  if (!venueId) {
    if (issue.editorialScope === "PUBLIC_NETWORK") return;
    throw new Error("Publishing requires at least one venue, restroom, or QR placement target.");
  }
  if (issue.venueId && issue.venueId !== venueId) throw new Error("Issue already belongs to a different venue.");
  if (restrooms.some((r: any) => r.venueId !== venueId) || qrCodes.some((q: any) => q.venueId !== venueId)) throw new Error("All publishing targets must belong to the selected issue venue.");
  const venue = await db.venue.findUnique({ where: { id: venueId }, select: { id: true, publisherId: true } });
  if (!venue) throw new Error("Resolved venue was not found.");
  if (issue.publisherId && venue.publisherId && issue.publisherId !== venue.publisherId) throw new Error("Issue publisher does not match the resolved venue publisher.");
  if (!issue.venueId) await db.issue.update({ where: { id: issueId }, data: { venueId } });
  const publishAt = targets.publishAt || new Date();
  if (targets.unpublishAt && targets.unpublishAt <= publishAt) throw new Error("End time must be after publication time.");
  const rows: Prisma.IssueTargetCreateManyInput[] = [];
  if (targets.venueId) rows.push({ issueId, venueId, targetType: "VENUE", isLive: false, publishAt, unpublishAt: targets.unpublishAt || null, publishedAt: publishAt });
  for (const r of restrooms) rows.push({ issueId, venueId, restroomId: r.id, targetType: "RESTROOM", isLive: false, publishAt, unpublishAt: targets.unpublishAt || null, publishedAt: publishAt });
  for (const q of qrCodes) rows.push({ issueId, venueId, restroomId: q.restroomId, qrCodeId: q.id, targetType: "QR_PLACEMENT", isLive: false, publishAt, unpublishAt: targets.unpublishAt || null, publishedAt: publishAt });
  if (!rows.length) throw new Error("Publishing must include at least one target.");
  if (targets.cancelExisting) await db.issueTarget.updateMany({ where: { issueId }, data: { canceledAt: new Date() } });
  await db.issueTarget.createMany({ data: rows });
}
