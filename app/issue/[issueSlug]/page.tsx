import GlobalIssuePage from "../page";
import VenueIssuePage from "@/app/issue/[venueSlug]/page";
import { prisma } from "@/lib/prisma";
import { withPublicTimeout } from "@/lib/public-route-timeouts";
import { StaticIssuePage, requestFromHeaders } from "../static-issue-page";

export const dynamic = "force-dynamic";

export default async function SpecificIssuePage({ params, searchParams }: { params: Promise<{ issueSlug: string }>; searchParams: Promise<{ qr?: string }> }) {
  const { issueSlug } = await params;
  const query = await searchParams;
  const request = await requestFromHeaders(`/issue/${encodeURIComponent(issueSlug)}${query.qr ? `?qr=${encodeURIComponent(query.qr)}` : ""}`);

  try {
    const issue = await withPublicTimeout(
      prisma.issue.findFirst({ where: { slug: issueSlug }, include: { venue: true } }),
      "specific issue lookup",
    );
    const routedQuery = { ...query, previewIssueId: issue?.id || "missing-issue" };
    if (issue?.venue?.slug) return <VenueIssuePage params={Promise.resolve({ venueSlug: issue.venue.slug })} searchParams={Promise.resolve(routedQuery)} />;
    return <GlobalIssuePage searchParams={Promise.resolve(routedQuery)} />;
  } catch (error) {
    console.error("Specific issue lookup failed; rendering static issue fallback.", error);
    return <StaticIssuePage qrCode={query.qr} request={request} />;
  }
}
