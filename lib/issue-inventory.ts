import { prisma } from "./prisma";
import { hasRestroomTypeColumns, restroomTypedSelect } from "./restroom-schema";

export const SPONSOR_SLOT_COUNT = 8;

export function issueInventoryMonth(issue: { month: string; year: number }) {
  const monthIndex = new Date(`${issue.month} 1, ${issue.year}`).getMonth() + 1;
  const normalizedMonth = Number.isFinite(monthIndex) && monthIndex > 0 ? monthIndex : 1;
  return `${issue.year}-${String(normalizedMonth).padStart(2, "0")}`;
}

export function audienceSegmentForIssue(issue: { restroomId?: string | null; restroom?: { restroomType?: string | null; name?: string | null } | null }) {
  if (!issue.restroomId) return "ALL_RESTROOMS";
  const type = issue.restroom?.restroomType || "SPECIFIC_RESTROOM";
  if (type === "MEN" || type === "MENS" || type === "MEN_ONLY") return "VENUE_MENS";
  if (type === "WOMEN" || type === "WOMENS" || type === "WOMEN_ONLY") return "VENUE_WOMENS";
  return "SPECIFIC_RESTROOM";
}

export async function ensureIssueAdInventory(issueId: string, db: any = prisma) {
  const includeTypeColumns = db === prisma ? await hasRestroomTypeColumns() : true;
  const issue = await db.issue.findUnique({
    where: { id: issueId },
    include: { venue: true, restroom: { select: restroomTypedSelect(includeTypeColumns) }, importedEvents: { where: { status: { in: ["APPROVED", "PUBLISHED"] } }, take: 1 } },
  });
  if (!issue || !issue.venueId || issue.status !== "PUBLISHED" || !issue.isPublished || issue.isArchived) return;
  const month = issueInventoryMonth(issue);
  const existing: Array<{ slotNumber: number }> = await db.adSlotInventory.findMany({ where: { issueId: issue.id }, select: { slotNumber: true } });
  const existingSlots = new Set(existing.map((slot) => slot.slotNumber));
  const data = Array.from({ length: SPONSOR_SLOT_COUNT }, (_, index) => index + 1)
    .filter((slotNumber) => !existingSlots.has(slotNumber))
    .map((slotNumber) => ({
      issueId: issue.id,
      venueId: issue.venueId!,
      restroomId: issue.restroomId,
      qrCodeId: issue.qrCodeId,
      slotNumber,
      month,
      audienceSegment: audienceSegmentForIssue(issue),
      eventCategory: issue.importedEvents[0]?.category || null,
      locationLabel: issue.restroom?.name || issue.venue?.name || null,
      priceCents: 5000,
      status: "OPEN" as const,
    }));
  if (data.length) await db.adSlotInventory.createMany({ data, skipDuplicates: true });
}

export function publishedIssueInventoryWhere(params: URLSearchParams | Record<string, string | undefined>) {
  const get = (key: string) => params instanceof URLSearchParams ? params.get(key) || undefined : params[key];
  const venue = get("venueId");
  const issue = get("issueId");
  const month = get("month");
  const year = get("year");
  const audience = get("audienceSegment");
  const eventCategory = get("eventCategory");
  const location = get("location");
  const available = get("availableOnly") !== "false";
  const status = get("status");
  const qrRoute = get("qrRoute");
  const slotType = get("slotType");
  const and = [
    ...(qrRoute ? [{ OR: [{ qrCode: { qrSlug: { contains: qrRoute, mode: "insensitive" as const } } }, { qrCode: { qrName: { contains: qrRoute, mode: "insensitive" as const } } }, { restroom: { slug: { contains: qrRoute, mode: "insensitive" as const } } }, { restroom: { name: { contains: qrRoute, mode: "insensitive" as const } } }] }] : []),
    ...(location ? [{ OR: [{ locationLabel: { contains: location, mode: "insensitive" as const } }, { venue: { name: { contains: location, mode: "insensitive" as const } } }, { venue: { city: { contains: location, mode: "insensitive" as const } } }, { venue: { state: { contains: location, mode: "insensitive" as const } } }, { toiletLocation: { label: { contains: location, mode: "insensitive" as const } } }] }] : []),
  ];
  const statuses = new Set(["OPEN", "RESERVED", "SOLD", "DISABLED"]);
  return {
    ...(venue ? { venueId: venue } : {}),
    ...(issue ? { issueId: issue } : {}),
    ...(month ? { month } : year ? { month: { startsWith: `${year}-` } } : {}),
    ...(audience ? { audienceSegment: audience } : {}),
    ...(eventCategory ? { eventCategory: { contains: eventCategory, mode: "insensitive" as const } } : {}),
    ...(slotType && Number(slotType) ? { slotNumber: Number(slotType) } : {}),
    ...(and.length ? { AND: and } : {}),
    ...(status && statuses.has(status) ? { status: status as any } : available ? { status: "OPEN" as const } : {}),
    issue: { is: { status: "PUBLISHED" as const, isPublished: true, isArchived: false } },
  };
}
