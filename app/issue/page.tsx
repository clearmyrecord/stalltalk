import { notFound } from "next/navigation";
import IssueByVenuePage from "./[venueSlug]/page";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function IssueQueryPage({ searchParams }: { searchParams: Promise<{ venue?: string; qr?: string }> }) {
  const { venue, qr } = await searchParams;
  if (venue) {
    const match = await prisma.venue.findFirst({ where: { slug: venue, isActive: true }, select: { slug: true } });
    if (!match) notFound();
    return <IssueByVenuePage params={Promise.resolve({ venueSlug: match.slug })} searchParams={Promise.resolve({ qr })} />;
  }

  const fallbackIssue = await prisma.issue.findFirst({ where: { status: "PUBLISHED", venueId: { not: null } }, orderBy: [{ year: "desc" }, { issueNumber: "desc" }], include: { venue: true } });
  const fallbackVenue = fallbackIssue?.venue || await prisma.venue.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
  if (!fallbackVenue) notFound();
  return <IssueByVenuePage params={Promise.resolve({ venueSlug: fallbackVenue.slug })} searchParams={Promise.resolve({ qr })} />;
}
