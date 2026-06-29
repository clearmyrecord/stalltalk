import { prisma } from "./prisma";
import { hasRestroomTypeColumns, restroomTypedSelect } from "./restroom-schema";

export const QR_ROUTE_INVENTORY_MONTH = "QR_ROUTE";
export const ROUTE_SPONSOR_SLOT_COUNT = 8;

export function audienceSegmentForRoute(restroom?: { name?: string | null; restroomType?: string | null; customTypeLabel?: string | null } | null) {
  if (!restroom) return "ALL_RESTROOMS";
  const value = `${restroom.customTypeLabel || ""} ${restroom.restroomType || ""} ${restroom.name || ""}`.toUpperCase();
  if (value.includes("MEN") && !value.includes("WOMEN")) return "VENUE_MENS";
  if (value.includes("WOMEN") || value.includes("WOMENS") || value.includes("LADIES")) return "VENUE_WOMENS";
  if (value.includes("FAMILY") || value.includes("ALL_GENDER") || value.includes("ALL-GENDER") || value.includes("GENDER")) return "FAMILY_ALL_GENDER";
  return "CUSTOM";
}

export async function ensureQrRouteAdInventory(qrCodeId: string, db: any = prisma) {
  const includeTypeColumns = db === prisma ? await hasRestroomTypeColumns() : true;
  const qr = await db.qrCode.findUnique({
    where: { id: qrCodeId },
    include: { venue: true, restroom: { select: restroomTypedSelect(includeTypeColumns) } },
  });
  if (!qr?.venueId || !qr.venue || qr.venue.status !== "ACTIVE" || !qr.venue.isActive || !["ACTIVE", "DEPLOYED"].includes(qr.status)) return;

  const existing: Array<{ slotNumber: number }> = await db.adSlotInventory.findMany({
    where: { issueId: null, qrCodeId: qr.id, month: QR_ROUTE_INVENTORY_MONTH },
    select: { slotNumber: true },
  });
  const existingSlots = new Set(existing.map((slot) => slot.slotNumber));
  const data = Array.from({ length: ROUTE_SPONSOR_SLOT_COUNT }, (_, index) => index + 1)
    .filter((slotNumber) => !existingSlots.has(slotNumber))
    .map((slotNumber) => ({
      issueId: null,
      venueId: qr.venueId,
      restroomId: qr.restroomId,
      qrCodeId: qr.id,
      slotNumber,
      month: QR_ROUTE_INVENTORY_MONTH,
      audienceSegment: audienceSegmentForRoute(qr.restroom),
      locationLabel: qr.restroom?.name || qr.venue.name,
      priceCents: 5000,
      status: "OPEN" as const,
    }));
  if (data.length) await db.adSlotInventory.createMany({ data, skipDuplicates: true });
}

export function qrRouteInventoryWhere(params: URLSearchParams | Record<string, string | undefined>) {
  const get = (key: string) => params instanceof URLSearchParams ? params.get(key) || undefined : params[key];
  const venue = get("venueId");
  const audience = get("audienceSegment");
  const status = get("status");
  const qrRoute = get("qrRoute");
  const slotType = get("slotType");
  const location = get("location");
  const eventCategory = get("eventCategory");
  const statuses = new Set(["OPEN", "RESERVED", "SOLD", "DISABLED"]);
  const and = [
    ...(qrRoute ? [{ OR: [{ qrCode: { qrSlug: { contains: qrRoute, mode: "insensitive" as const } } }, { qrCode: { qrName: { contains: qrRoute, mode: "insensitive" as const } } }, { qrCode: { shortUrl: { contains: qrRoute, mode: "insensitive" as const } } }, { qrCode: { destinationUrl: { contains: qrRoute, mode: "insensitive" as const } } }] }] : []),
    ...(location ? [{ OR: [{ locationLabel: { contains: location, mode: "insensitive" as const } }, { venue: { name: { contains: location, mode: "insensitive" as const } } }, { venue: { city: { contains: location, mode: "insensitive" as const } } }, { venue: { state: { contains: location, mode: "insensitive" as const } } }, { restroom: { name: { contains: location, mode: "insensitive" as const } } }, { toiletLocation: { label: { contains: location, mode: "insensitive" as const } } }] }] : []),
  ];
  return {
    issueId: null,
    month: QR_ROUTE_INVENTORY_MONTH,
    qrCodeId: { not: null },
    ...(venue ? { venueId: venue } : {}),
    ...(audience ? { audienceSegment: audience } : {}),
    ...(slotType && Number(slotType) ? { slotNumber: Number(slotType) } : {}),
    ...(eventCategory ? { eventCategory: { contains: eventCategory, mode: "insensitive" as const } } : {}),
    ...(and.length ? { AND: and } : {}),
    ...(status && statuses.has(status) ? { status: status as any } : { status: "OPEN" as const }),
    qrCode: { is: { status: { in: ["ACTIVE", "DEPLOYED"] as any }, venue: { is: { status: "ACTIVE" as const, isActive: true } } } },
  };
}
