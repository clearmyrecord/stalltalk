import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { scheduledTargetWhere, targetOrderBy } from "./venue-issue-schedule";

const liveIssue = { status: { in: ["PUBLISHED", "SCHEDULED"] }, isPublished: true, isArchived: false } as const;

type Db = typeof prisma | any;

export async function resolvePermanentQr(token: string, db: Db = prisma, now = new Date()) {
  const placement = await db.qrCode.findFirst({ where: { OR: [{ publicToken: token }, { qrSlug: token }, { slug: token }], isActive: true }, include: { venue: true, restroom: true } });
  if (placement?.venueId) {
    const issue = await issueForPlacement(placement, db, now);
    return { kind: "placement" as const, placement, venue: placement.venue, restroom: placement.restroom, issue };
  }
  const venue = await db.venue.findFirst({ where: { OR: [{ publicToken: token }, { slug: token }], isActive: true } });
  if (!venue) return null;
  const issue = await venueIssue(venue.id, db, now);
  return { kind: "venue" as const, placement: null, venue, restroom: null, issue };
}

async function issueForPlacement(qr: { id: string; venueId: string | null; restroomId: string | null }, db: Db, now: Date) {
  const direct = await db.issueTarget.findFirst({ where: { qrCodeId: qr.id, targetType: "QR_PLACEMENT", ...scheduledTargetWhere(now) }, include: { issue: true }, orderBy: targetOrderBy() });
  if (direct?.issue) return direct.issue;
  if (qr.restroomId) {
    const restroom = await db.issueTarget.findFirst({ where: { restroomId: qr.restroomId, targetType: "RESTROOM", ...scheduledTargetWhere(now) }, include: { issue: true }, orderBy: targetOrderBy() });
    if (restroom?.issue) return restroom.issue;
  }
  if (!qr.venueId) return null;
  if (qr.restroomId) {
    const legacyRestroom = await db.issue.findFirst({ where: { venueId: qr.venueId, restroomId: qr.restroomId, ...liveIssue, publishedAt: { lte: now } }, orderBy: [{ publishedAt: "desc" }, { id: "desc" }] });
    if (legacyRestroom) return legacyRestroom;
  }
  return venueIssue(qr.venueId, db, now);
}

async function venueIssue(venueId: string, db: Db, now: Date) {
  const targeted = await db.issueTarget.findFirst({ where: { venueId, targetType: "VENUE", ...scheduledTargetWhere(now) }, include: { issue: true }, orderBy: targetOrderBy() });
  if (targeted?.issue) return targeted.issue;
  return db.issue.findFirst({ where: { venueId, restroomId: null, ...liveIssue, publishedAt: { lte: now } }, orderBy: [{ publishedAt: "desc" }, { id: "desc" }] });
}

export async function publishIssueTargets(issueId: string, targets: { venueId?: string | null; restroomIds: string[]; qrCodeIds: string[]; publishAt?: Date | null; unpublishAt?: Date | null; cancelExisting?: boolean }, db: Db = prisma) {
  const issue = await db.issue.findUnique({ where: { id: issueId }, select: { id: true, venueId: true, publisherId: true } });
  if (!issue) throw new Error("Issue not found.");
  const qrCodes = targets.qrCodeIds.length ? await db.qrCode.findMany({ where: { id: { in: targets.qrCodeIds } }, select: { id: true, venueId: true, restroomId: true } }) : [];
  const restrooms = targets.restroomIds.length ? await db.restroom.findMany({ where: { id: { in: targets.restroomIds } }, select: { id: true, venueId: true } }) : [];
  const venueId = targets.venueId || issue.venueId || restrooms[0]?.venueId || qrCodes[0]?.venueId;
  if (!venueId) throw new Error("Publishing requires at least one venue, restroom, or QR placement target.");
  if (restrooms.some((r: any) => r.venueId !== venueId) || qrCodes.some((q: any) => q.venueId !== venueId)) throw new Error("All publishing targets must belong to the selected issue venue.");
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
