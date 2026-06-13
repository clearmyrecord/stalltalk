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

  const fallbackIssue = await prisma.issue.findFirst({ where: { status: "PUBLISHED" }, orderBy: [{ year: "desc" }, { issueNumber: "desc" }], include: { venue: true } });
  if (!fallbackIssue) notFound();
  return <IssueByVenuePage params={Promise.resolve({ venueSlug: fallbackIssue.venue.slug })} searchParams={Promise.resolve({ qr })} />;
}
