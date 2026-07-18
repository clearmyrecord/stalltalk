import test from "node:test";
import assert from "node:assert/strict";
import { resolvePermanentQr } from "../lib/permanent-qr-routing";
import { zonedDateTimeToUtc, computeIssueState, formatInVenueTime } from "../lib/venue-issue-schedule";

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

test("formatInVenueTime formats venue-local Los Angeles dates", () => {
  assert.equal(formatInVenueTime(new Date("2026-07-15T16:30:00Z"), "America/Los_Angeles"), "Jul 15, 2026, 9:30 AM PDT");
});

test("formatInVenueTime shows PDT and PST abbreviations", () => {
  assert.equal(formatInVenueTime(new Date("2026-07-15T16:00:00Z"), "America/Los_Angeles"), "Jul 15, 2026, 9:00 AM PDT");
  assert.equal(formatInVenueTime(new Date("2026-01-15T17:00:00Z"), "America/Los_Angeles"), "Jan 15, 2026, 9:00 AM PST");
});

test("formatInVenueTime preserves em dash for null dates", () => {
  assert.equal(formatInVenueTime(null, "America/Los_Angeles"), "—");
  assert.equal(formatInVenueTime(undefined, "America/Los_Angeles"), "—");
});

test("formatInVenueTime falls back to Los Angeles for invalid venue time zones", () => {
  assert.equal(formatInVenueTime(new Date("2026-01-15T17:00:00Z"), "Invalid/Zone"), "Jan 15, 2026, 9:00 AM PST");
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
import { htmlCheckboxValue, normalizeSectionPositions } from "../lib/form-utils";
import { publishIssueTargets } from "../lib/permanent-qr-routing";

test("unchecked Active checkbox is false because omitted FormData is not defaulted on", () => {
  const unchecked = new FormData();
  assert.equal(htmlCheckboxValue(unchecked, "isActive"), false);
  const checked = new FormData();
  checked.set("isActive", "on");
  assert.equal(htmlCheckboxValue(checked, "isActive"), true);
});

test("venue portal blockSortOrder fields are honored then normalized", () => {
  const normalized = normalizeSectionPositions([
    { id: "a", requestedSortOrder: 20 },
    { id: "b", requestedSortOrder: 10 },
    { id: "c", requestedSortOrder: 10 },
  ]);
  assert.deepEqual(normalized.map((b) => [b.id, b.sortOrder]), [["b", 1], ["c", 2], ["a", 3]]);
});

test("publishIssueTargets allows future scheduled records without flipping isLive and infers target venue from QR/restroom targets", async () => {
  const created: any[] = [];
  const mock = {
    issue: { findUnique: async () => ({ id: "issue1", venueId: null, publisherId: "pub1" }), update: async () => ({}) },
    venue: { findUnique: async () => ({ id: venue.id, publisherId: "pub1" }) },
    restroom: { findMany: async () => [{ id: restroom.id, venueId: venue.id }] },
    qrCode: { findMany: async () => [{ id: qr.id, venueId: venue.id, restroomId: restroom.id }] },
    issueTarget: { updateMany: async () => { throw new Error("isLive rows should not be switched for schedules"); }, createMany: async ({ data }: any) => { created.push(...data); } },
  };
  await publishIssueTargets("issue1", { restroomIds: [restroom.id], qrCodeIds: [], publishAt: new Date("2026-09-01T00:00:00Z") }, mock as any);
  await publishIssueTargets("issue1", { restroomIds: [], qrCodeIds: [qr.id], publishAt: new Date("2026-10-01T00:00:00Z") }, mock as any);
  assert.deepEqual(created.map((row) => [row.venueId, row.restroomId, row.qrCodeId || null, row.isLive]), [[venue.id, restroom.id, null, false], [venue.id, restroom.id, qr.id, false]]);
});

test("legacy restroom-published issues still resolve when no IssueTarget exists", async () => {
  const legacy = issue("legacy-restroom");
  const db = {
    qrCode: { findFirst: async () => qr },
    issueTarget: { findFirst: async () => null },
    issue: { findFirst: async ({ where }: any) => where.restroomId === restroom.id ? legacy : null },
  };
  assert.equal((await resolvePermanentQr(qr.publicToken, db as any, new Date("2026-07-15T00:00:00Z")))?.issue?.id, "legacy-restroom");
});


test("publishIssueTargets persists inferred venue before permanent QR resolution serves targeted issue", async () => {
  const state: any = {
    issue: { id: "targeted", title: "Targeted", slug: "targeted", status: "PUBLISHED", isPublished: true, isArchived: false, venueId: null, publisherId: "pub1" },
    targets: [] as any[],
    updates: [] as any[],
  };
  const db = {
    issue: {
      findUnique: async () => state.issue,
      update: async ({ data }: any) => { state.issue = { ...state.issue, ...data }; state.updates.push(data); return state.issue; },
      findFirst: async () => ({ id: "global", title: "Global fallback", slug: "global", status: "PUBLISHED", isPublished: true, isArchived: false, venueId: null }),
    },
    venue: { findUnique: async () => ({ id: venue.id, publisherId: "pub1" }), findFirst: async () => venue },
    restroom: { findMany: async () => [] },
    qrCode: { findMany: async () => [{ id: qr.id, venueId: venue.id, restroomId: restroom.id }], findFirst: async () => ({ ...qr, venue, restroom }) },
    issueTarget: {
      updateMany: async () => ({}),
      createMany: async ({ data }: any) => { state.targets.push(...data.map((row: any) => ({ ...row, issue: state.issue }))); },
      findFirst: async ({ where }: any) => {
        const row = state.targets.find((target: any) => target.qrCodeId === where.qrCodeId && target.targetType === where.targetType && target.publishAt <= where.publishAt.lte && !target.canceledAt);
        return row ? { ...row, issue: state.issue } : null;
      },
    },
  };
  await publishIssueTargets("targeted", { restroomIds: [], qrCodeIds: [qr.id], publishAt: new Date("2026-07-01T00:00:00Z") }, db as any);
  const resolved = await resolvePermanentQr(qr.publicToken, db as any, new Date("2026-07-02T00:00:00Z"));
  assert.equal(state.updates[0].venueId, venue.id);
  assert.equal(resolved?.issue?.id, "targeted");
  assert.notEqual(resolved?.issue?.id, "global");
});

test("publishIssueTargets rejects cross-venue and publisher-incompatible issue targets", async () => {
  const baseDb = (issuePatch: any, venuePatch: any) => ({
    issue: { findUnique: async () => ({ id: "issue1", venueId: null, publisherId: "pub1", ...issuePatch }), update: async () => ({}) },
    venue: { findUnique: async () => ({ id: venue.id, publisherId: "pub1", ...venuePatch }) },
    restroom: { findMany: async () => [{ id: restroom.id, venueId: venue.id }] },
    qrCode: { findMany: async () => [] },
    issueTarget: { updateMany: async () => ({}), createMany: async () => ({}) },
  });
  await assert.rejects(() => publishIssueTargets("issue1", { venueId: venue.id, restroomIds: [], qrCodeIds: [] }, baseDb({ venueId: "other" }, {}) as any), /different venue/);
  await assert.rejects(() => publishIssueTargets("issue1", { venueId: venue.id, restroomIds: [], qrCodeIds: [] }, baseDb({}, { publisherId: "other-pub" }) as any), /publisher/);
});
