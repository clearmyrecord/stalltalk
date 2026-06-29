import { adSlotInventoryColumnOptions, dynamicAdSlotInventoryData, getAdSlotInventoryColumns } from "./advertiser-route-inventory";
import { prisma } from "./prisma";

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
  const inventoryColumns = await getAdSlotInventoryColumns(db);
  const { includeIssueIdColumn } = adSlotInventoryColumnOptions(inventoryColumns);
  if (!includeIssueIdColumn) return;

  const issue = await db.issue.findUnique({
    where: { id: issueId },
    include: { venue: true, restroom: { select: { id: true, name: true } }, importedEvents: { where: { status: { in: ["APPROVED", "PUBLISHED"] } }, take: 1 } },
  });
  if (!issue || !issue.venueId || issue.status !== "PUBLISHED" || !issue.isPublished || issue.isArchived) return;
  const month = issueInventoryMonth(issue);
  const existing: Array<{ slotNumber: number }> = await db.adSlotInventory.findMany({ where: { issueId: issue.id }, select: { slotNumber: true } });
  const existingSlots = new Set(existing.map((slot) => slot.slotNumber));
  const data = Array.from({ length: SPONSOR_SLOT_COUNT }, (_, index) => index + 1)
    .filter((slotNumber) => !existingSlots.has(slotNumber))
    .map((slotNumber) => dynamicAdSlotInventoryData({
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
    }, inventoryColumns));
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
  return {
    ...(venue ? { venueId: venue } : {}),
    ...(issue ? { issueId: issue } : {}),
    ...(month ? { month } : year ? { month: { startsWith: `${year}-` } } : {}),
    ...(audience ? { audienceSegment: audience } : {}),
    ...(eventCategory ? { eventCategory } : {}),
    ...(location ? { OR: [{ locationLabel: { contains: location, mode: "insensitive" as const } }, { venue: { city: { contains: location, mode: "insensitive" as const } } }, { venue: { state: { contains: location, mode: "insensitive" as const } } }] } : {}),
    ...(available ? { status: "OPEN" as const } : {}),
    issue: { is: { status: "PUBLISHED" as const, isPublished: true, isArchived: false } },
  };
}
