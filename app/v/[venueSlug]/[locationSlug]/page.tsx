import { prisma } from "@/lib/prisma";
import VenueIssuePage from "@/app/issue/[slug]/page";
import { locationSlug as makeLocationSlug } from "@/lib/issue-routing";
import { restroomTypedSelect } from "@/lib/restroom-schema";

export const dynamic = "force-dynamic";

function audienceMatches(restroom: { name?: string | null; restroomType?: string | null }, slug: string) {
  const value = `${restroom.restroomType || ""} ${restroom.name || ""}`.toLowerCase();
  if (slug === "mens") return value.includes("men") && !value.includes("women");
  if (slug === "womens") return value.includes("women") || value.includes("ladies");
  if (slug === "family") return value.includes("family") || value.includes("all_gender") || value.includes("all-gender") || value.includes("gender");
  return false;
}

export default async function Page({ params, searchParams }: any) {
  const { venueSlug, locationSlug } = await params;
  const venue = await prisma.venue.findUnique({ where: { slug: venueSlug } });
  const restrooms = venue
    ? await prisma.restroom.findMany({ where: { venueId: venue.id, status: "ACTIVE" }, select: restroomTypedSelect(true), orderBy: { name: "asc" } })
    : [];
  const restroom = restrooms.find((r: any) => makeLocationSlug(r.slug || r.name, r.id) === locationSlug) || restrooms.find((r: any) => audienceMatches(r, locationSlug));
  const qr = restroom
    ? await prisma.qrCode.findFirst({ where: { venueId: venue!.id, restroomId: restroom.id }, select: { id: true, qrSlug: true, issueId: true } })
    : null;

  return <VenueIssuePage params={Promise.resolve({ venueSlug })} searchParams={Promise.resolve({ ...(await searchParams), qr: qr?.qrSlug, previewIssueId: qr?.issueId })} />;
}
