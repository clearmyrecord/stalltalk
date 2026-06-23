import { prisma } from "@/lib/prisma";
import VenueIssuePage from "@/app/issue/[venueSlug]/page";
export const dynamic = "force-dynamic";
export default async function Page({ params, searchParams }: any) {
  const { venueSlug, issueSlug } = await params;
  const issue = await prisma.issue.findFirst({ where: { slug: issueSlug }, select: { id: true } });
  return <VenueIssuePage params={Promise.resolve({ venueSlug })} searchParams={Promise.resolve({ ...(await searchParams), previewIssueId: issue?.id || "missing-location-issue" })} />;
}
