import { prisma } from "@/lib/prisma";
import { restroomLabelSelect } from "@/lib/restroom-schema";
import { locationSlug } from "@/lib/issue-routing";
import { publicBaseUrl } from "@/lib/qr";

export const RESTROOM_TYPES = ["MEN", "WOMEN", "FAMILY", "ALL_GENDER", "STAFF", "CUSTOM"] as const;
export const restroomTypeLabels: Record<(typeof RESTROOM_TYPES)[number], string> = {
  MEN: "Men's",
  WOMEN: "Women's",
  FAMILY: "Family",
  ALL_GENDER: "All-gender",
  STAFF: "Staff",
  CUSTOM: "Custom",
};

function qrSlugSafe(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "qr";
}

export function venueQrPath(venueSlug: string, restroom?: { id: string; slug?: string | null; name?: string | null; restroomType?: string | null } | null) {
  if (!restroom) return `/v/${venueSlug}`;
  const type = restroom.restroomType?.toUpperCase();
  if (type === "MEN") return `/v/${venueSlug}/mens`;
  if (type === "WOMEN") return `/v/${venueSlug}/womens`;
  if (type === "FAMILY" || type === "ALL_GENDER") return `/v/${venueSlug}/family`;
  return `/v/${venueSlug}/${locationSlug(restroom.slug || restroom.name, restroom.id)}`;
}

export function venueQrUrl(venueSlug: string, restroom?: { id: string; slug?: string | null; name?: string | null; restroomType?: string | null } | null) {
  return `${publicBaseUrl()}${venueQrPath(venueSlug, restroom)}`;
}

export async function ensureVenueQrCodes(venueId: string) {
  const venue = await prisma.venue.findUnique({ where: { id: venueId }, select: { id: true, publisherId: true, name: true, slug: true, restrooms: { where: { status: "ACTIVE" }, select: { ...restroomLabelSelect, restroomType: true }, orderBy: { name: "asc" } }, qrCodes: true } });
  if (!venue) return [];
  const existing = venue.qrCodes;
  const created = [];
  const venueSlug = `venue-${qrSlugSafe(venue.slug)}`;
  if (!existing.some((q) => q.qrType === "VENUE" && !q.restroomId)) {
    created.push(await prisma.qrCode.create({ data: { publisherId: venue.publisherId, venueId: venue.id, qrName: `${venue.name} Venue QR`, qrSlug: venueSlug, qrUrl: `/scan/${venueSlug}`, shortUrl: `/q/${venueSlug}`, destinationType: "VENUE", destinationUrl: venueQrPath(venue.slug), qrType: "VENUE", status: "ACTIVE", callToAction: "Scan for this venue's issue" } }));
  }
  for (const restroom of venue.restrooms) {
    if (existing.some((q) => q.restroomId === restroom.id)) continue;
    const slug = `venue-${qrSlugSafe(venue.slug)}-${qrSlugSafe(restroom.slug || restroom.name)}`;
    created.push(await prisma.qrCode.create({ data: { publisherId: venue.publisherId, venueId: venue.id, restroomId: restroom.id, qrName: `${venue.name} ${restroom.name} QR`, qrSlug: slug, qrUrl: `/scan/${slug}`, shortUrl: `/q/${slug}`, destinationType: "LOCATION", destinationUrl: venueQrPath(venue.slug, restroom), qrType: "RESTROOM", status: "ACTIVE", callToAction: "Scan for this restroom's issue" } }));
  }
  return prisma.qrCode.findMany({ where: { venueId: venue.id }, include: { restroom: { select: { ...restroomLabelSelect, restroomType: true } } }, orderBy: [{ qrType: "asc" }, { qrName: "asc" }] });
}
