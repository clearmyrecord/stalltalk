import GlobalIssuePage from "../page";
import VenueIssuePage from "@/app/issue/[venueSlug]/page";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export default async function SpecificIssuePage({ params, searchParams }: { params: Promise<{ issueSlug: string }>; searchParams: Promise<{ qr?: string }> }) {
  const { issueSlug } = await params;
  const issue = await prisma.issue.findFirst({ where: { slug: issueSlug }, include: { venue: true } });
  const query = { ...(await searchParams), previewIssueId: issue?.id || "missing-issue" };
  if (issue?.venue?.slug) return <VenueIssuePage params={Promise.resolve({ venueSlug: issue.venue.slug })} searchParams={Promise.resolve(query)} />;
  return <GlobalIssuePage searchParams={Promise.resolve(query)} />;
}
