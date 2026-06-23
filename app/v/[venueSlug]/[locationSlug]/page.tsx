import { prisma } from "@/lib/prisma";
import VenueIssuePage from "@/app/issue/[venueSlug]/page";
import { locationSlug as makeLocationSlug } from "@/lib/issue-routing";
export const dynamic = "force-dynamic";
export default async function Page({ params, searchParams }: any) {
  const { venueSlug, locationSlug } = await params;
  const venue = await prisma.venue.findUnique({ where: { slug: venueSlug } });
  const restroom = venue ? (await prisma.restroom.findMany({ where: { venueId: venue.id } })).find((r: any) => makeLocationSlug(r.slug || r.name, r.id) === locationSlug) : null;
  const active = restroom ? await prisma.issue.findFirst({ where: { venueId: venue!.id, restroomId: restroom.id, status: "PUBLISHED", isArchived: false }, orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }] }) : null;
  return <VenueIssuePage params={Promise.resolve({ venueSlug })} searchParams={Promise.resolve({ ...(await searchParams), previewIssueId: active?.id })} />;
}
