import test from "node:test";
import assert from "node:assert/strict";
import { resolvePermanentQr } from "../lib/permanent-qr-routing";
import { zonedDateTimeToUtc, computeIssueState } from "../lib/venue-issue-schedule";

const venue = { id: "venue1", slug: "pt-taverns-horizon", publicToken: "pt-taverns-horizon", isActive: true, publisherId: "pub1", timeZone: "America/Los_Angeles" };
const restroom = { id: "rest1", venueId: venue.id, name: "Men's" };
const qr = { id: "qr1", qrSlug: "stall-one", publicToken: "stall-one", slug: "stall-one", venueId: venue.id, restroomId: restroom.id, isActive: true, venue, restroom };
const issue = (id: string, title = id, status = "PUBLISHED", isPublished = true, isArchived = false) => ({ id, title, slug: id, status, isPublished, isArchived, venueId: venue.id });

function mockDb(targets: any[]) {
  const findTarget = (where: any) => targets
    .filter((t) => (!where.qrCodeId || t.qrCodeId === where.qrCodeId) && (!where.restroomId || t.restroomId === where.restroomId) && (!where.venueId || t.venueId === where.venueId) && t.targetType === where.targetType && !t.canceledAt && t.issue.isPublished && !t.issue.isArchived && ["PUBLISHED", "SCHEDULED"].includes(t.issue.status) && t.publishAt <= where.publishAt.lte && (!t.unpublishAt || t.unpublishAt > where.OR[1].unpublishAt.gt))
    .sort((a, b) => b.publishAt.getTime() - a.publishAt.getTime() || b.issueId.localeCompare(a.issueId))[0] || null;
  return {
    qrCode: { findFirst: async () => qr },
    venue: { findFirst: async () => venue },
    issue: { findFirst: async () => null },
    issueTarget: { findFirst: async ({ where }: any) => { const row = findTarget(where); return row ? { ...row, issue: row.issue } : null; } },
  };
}

test("scheduled issue does not display early, current remains live, then later issue wins at publishAt", async () => {
  const oldIssue = issue("old");
  const nextIssue = issue("next", "next", "SCHEDULED", true);
  const targets = [
    { issueId: "old", venueId: venue.id, targetType: "VENUE", publishAt: new Date("2026-07-01T00:00:00Z"), issue: oldIssue },
    { issueId: "next", venueId: venue.id, targetType: "VENUE", publishAt: new Date("2026-08-01T00:00:00Z"), issue: nextIssue },
  ];
  assert.equal((await resolvePermanentQr(venue.slug, mockDb(targets), new Date("2026-07-31T23:59:59Z")))?.issue?.id, "old");
  assert.equal((await resolvePermanentQr(venue.slug, mockDb(targets), new Date("2026-08-01T00:00:00Z")))?.issue?.id, "next");
});

test("unpublishAt, canceled, draft, and evergreen fallback behavior", async () => {
  const ended = { issueId: "ended", venueId: venue.id, targetType: "VENUE", publishAt: new Date("2026-07-01T00:00:00Z"), unpublishAt: new Date("2026-07-10T00:00:00Z"), issue: issue("ended") };
  assert.equal((await resolvePermanentQr(venue.slug, mockDb([ended]), new Date("2026-07-10T00:00:00Z")))?.issue, null);
  const canceled = { ...ended, issueId: "canceled", unpublishAt: null, canceledAt: new Date(), issue: issue("canceled") };
  const draft = { ...ended, issueId: "draft", unpublishAt: null, issue: issue("draft", "draft", "DRAFT", false) };
  assert.equal((await resolvePermanentQr(venue.slug, mockDb([canceled, draft]), new Date("2026-07-05T00:00:00Z")))?.issue, null);
});

test("overlaps resolve by latest publishAt then issue id", async () => {
  const sameTime = new Date("2026-07-05T00:00:00Z");
  const targets = ["a", "z"].map((id) => ({ issueId: id, venueId: venue.id, targetType: "VENUE", publishAt: sameTime, issue: issue(id) }));
  assert.equal((await resolvePermanentQr(venue.slug, mockDb(targets), sameTime))?.issue?.id, "z");
});

test("QR, restroom, venue priority still applies with schedule qualification", async () => {
  const now = new Date("2026-07-08T00:00:00Z");
  const targets = [
    { issueId: "venue", venueId: venue.id, targetType: "VENUE", publishAt: new Date("2026-07-01T00:00:00Z"), issue: issue("venue") },
    { issueId: "restroom", venueId: venue.id, restroomId: restroom.id, targetType: "RESTROOM", publishAt: new Date("2026-07-02T00:00:00Z"), issue: issue("restroom") },
    { issueId: "qr", venueId: venue.id, restroomId: restroom.id, qrCodeId: qr.id, targetType: "QR_PLACEMENT", publishAt: new Date("2026-07-03T00:00:00Z"), issue: issue("qr") },
  ];
  assert.equal((await resolvePermanentQr(qr.publicToken, mockDb(targets), now))?.issue?.id, "qr");
});

test("venue timezone conversion handles DST transition offsets", () => {
  assert.equal(zonedDateTimeToUtc("2026-01-15", "09:00", "America/Los_Angeles")?.toISOString(), "2026-01-15T17:00:00.000Z");
  assert.equal(zonedDateTimeToUtc("2026-07-15", "09:00", "America/Los_Angeles")?.toISOString(), "2026-07-15T16:00:00.000Z");
});

test("computed states include draft, scheduled, live, ended, and canceled", () => {
  const now = new Date("2026-07-15T00:00:00Z");
  assert.equal(computeIssueState({ status: "DRAFT", isPublished: false, isScheduled: false }, now), "Draft");
  assert.equal(computeIssueState({ status: "SCHEDULED", isPublished: true, isScheduled: true, issueTargets: [{ publishAt: new Date("2026-08-01T00:00:00Z") }] }, now), "Scheduled");
  assert.equal(computeIssueState({ status: "PUBLISHED", isPublished: true, issueTargets: [{ publishAt: new Date("2026-07-01T00:00:00Z") }] }, now), "Live");
  assert.equal(computeIssueState({ status: "PUBLISHED", isPublished: true, issueTargets: [{ publishAt: new Date("2026-07-01T00:00:00Z"), unpublishAt: new Date("2026-07-10T00:00:00Z") }] }, now), "Ended");
  assert.equal(computeIssueState({ status: "PUBLISHED", isPublished: true, issueTargets: [{ canceledAt: now }] }, now), "Canceled");
});
