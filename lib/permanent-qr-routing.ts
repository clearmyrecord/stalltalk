import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

const liveIssue = { status: "PUBLISHED", isPublished: true, isArchived: false } as const;

export async function resolvePermanentQr(token: string, db: any = prisma) {
  const placement = await db.qrCode.findFirst({ where: { OR: [{ publicToken: token }, { qrSlug: token }, { slug: token }], isActive: true }, include: { venue: true, restroom: true } });
  if (placement?.venueId) {
    const issue = await issueForPlacement(placement, db);
    return { kind: "placement" as const, placement, venue: placement.venue, restroom: placement.restroom, issue };
  }
  const venue = await db.venue.findFirst({ where: { OR: [{ publicToken: token }, { slug: token }], isActive: true } });
  if (!venue) return null;
  const issue = await venueIssue(venue.id, db);
  return { kind: "venue" as const, placement: null, venue, restroom: null, issue };
}

async function issueForPlacement(qr: { id: string; venueId: string | null; restroomId: string | null }, db: any) {
  const direct = await db.issueTarget.findFirst({ where: { qrCodeId: qr.id, targetType: "QR_PLACEMENT", isLive: true, issue: liveIssue }, include: { issue: true }, orderBy: { publishedAt: "desc" } });
  if (direct?.issue) return direct.issue;
  if (qr.restroomId) {
    const restroom = await db.issueTarget.findFirst({ where: { restroomId: qr.restroomId, targetType: "RESTROOM", isLive: true, issue: liveIssue }, include: { issue: true }, orderBy: { publishedAt: "desc" } });
    if (restroom?.issue) return restroom.issue;
  }
  return qr.venueId ? venueIssue(qr.venueId, db) : null;
}

async function venueIssue(venueId: string, db: any) {
  const targeted = await db.issueTarget.findFirst({ where: { venueId, targetType: "VENUE", isLive: true, issue: liveIssue }, include: { issue: true }, orderBy: { publishedAt: "desc" } });
  if (targeted?.issue) return targeted.issue;
  return db.issue.findFirst({ where: { venueId, restroomId: null, ...liveIssue }, orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }] });
}

export async function publishIssueTargets(issueId: string, targets: { venueId?: string | null; restroomIds: string[]; qrCodeIds: string[] }, db: any = prisma) {
  const issue = await db.issue.findUnique({ where: { id: issueId }, select: { id: true, venueId: true, publisherId: true } });
  if (!issue) throw new Error("Issue not found.");
  const qrCodes = targets.qrCodeIds.length ? await db.qrCode.findMany({ where: { id: { in: targets.qrCodeIds } }, select: { id: true, venueId: true, restroomId: true } }) : [];
  const restrooms = targets.restroomIds.length ? await db.restroom.findMany({ where: { id: { in: targets.restroomIds } }, select: { id: true, venueId: true } }) : [];
  const venueId = targets.venueId || issue.venueId || restrooms[0]?.venueId || qrCodes[0]?.venueId;
  if (!venueId) throw new Error("Publishing requires at least one venue, restroom, or QR placement target.");
  if (restrooms.some((r: any) => r.venueId !== venueId) || qrCodes.some((q: any) => q.venueId !== venueId)) throw new Error("All publishing targets must belong to the selected issue venue.");
  const rows: Prisma.IssueTargetCreateManyInput[] = [];
  if (targets.venueId) rows.push({ issueId, venueId, targetType: "VENUE", isLive: true, publishedAt: new Date() });
  for (const r of restrooms) rows.push({ issueId, venueId, restroomId: r.id, targetType: "RESTROOM", isLive: true, publishedAt: new Date() });
  for (const q of qrCodes) rows.push({ issueId, venueId, restroomId: q.restroomId, qrCodeId: q.id, targetType: "QR_PLACEMENT", isLive: true, publishedAt: new Date() });
  if (!rows.length) throw new Error("Publishing must include at least one target.");
  await db.issueTarget.updateMany({ where: { isLive: true, OR: rows.map((r) => r.targetType === "VENUE" ? { targetType: r.targetType, venueId } : r.targetType === "RESTROOM" ? { targetType: r.targetType, restroomId: r.restroomId } : { targetType: r.targetType, qrCodeId: r.qrCodeId }) }, data: { isLive: false } });
  await db.issueTarget.createMany({ data: rows });
}
