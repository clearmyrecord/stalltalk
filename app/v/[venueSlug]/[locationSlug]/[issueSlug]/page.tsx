import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { IssueNotFound } from "@/components/IssueNotFound";
import VenueIssuePage from "@/app/issue/[slug]/page";
export const dynamic = "force-dynamic";

async function canViewIssue(issue: { status: string; isPublished: boolean; isArchived: boolean; venueId?: string | null }) {
  if (issue.status === "PUBLISHED" && issue.isPublished && !issue.isArchived) return true;
  const user = await currentUser();
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return user.role === "VENUE_MANAGER" && Boolean(issue.venueId) && user.venueId === issue.venueId;
}

export default async function Page({ params, searchParams }: any) {
  const { venueSlug, issueSlug } = await params;
  const issue = await prisma.issue.findFirst({ where: { slug: issueSlug }, select: { id: true, status: true, isPublished: true, isArchived: true, venueId: true } });
  if (issue && !(await canViewIssue(issue))) return <IssueNotFound title="Issue not available" message="This issue is not published yet." />;
  return <VenueIssuePage params={Promise.resolve({ venueSlug })} searchParams={Promise.resolve({ ...(await searchParams), previewIssueId: issue?.id || "missing-location-issue" })} />;
}
