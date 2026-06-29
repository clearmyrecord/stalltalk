import Link from "next/link";
import { redirect } from "next/navigation";
import { createVenueIssue } from "@/lib/actions";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { restroomBaseSelect } from "@/lib/restroom-schema";
import { ProfileOnboarding } from "@/components/portal/ProfileOnboarding";
import { IssueEditor } from "../IssueEditor";

export default async function NewVenueIssuePage() {
  const user = await currentUser();
  if (!user) redirect("/signin?error=admin_required");
  const venue = user.venueId ? await prisma.venue.findUnique({ where: { id: user.venueId } }) : null;
  if (!venue) return <main className="min-h-screen bg-paper p-8 text-ink"><ProfileOnboarding title="Link your venue before creating issues" endpoint="/api/portal/venue/profile" button="Save Venue Profile" fields={[{ name: "venueName", label: "Venue name" }, { name: "address", label: "Address" }, { name: "city", label: "City" }, { name: "state", label: "State" }]} /></main>;
  const [articles, ads, restrooms, qrCodes] = await Promise.all([
    prisma.article.findMany({ where: { publisherId: venue.publisherId, OR: [{ venueIds: { has: venue.id } }, { venueIds: { isEmpty: true } }] }, orderBy: { updatedAt: "desc" } }),
    prisma.ad.findMany({ where: { status: "ACTIVE", scope: { in: ["VENUE", "RESTROOM"] }, OR: [{ venueId: venue.id }, { venueIds: { has: venue.id } }, { restroom: { venueId: venue.id } }] }, orderBy: { updatedAt: "desc" } }),
    prisma.restroom.findMany({ where: { venueId: venue.id }, select: restroomBaseSelect, orderBy: { name: "asc" } }),
    prisma.qrCode.findMany({ where: { venueId: venue.id }, orderBy: { qrName: "asc" } }),
  ]);
  return <main className="min-h-screen bg-paper p-8 text-ink"><Link href="/portal/venue/issues" className="font-black uppercase text-stallRed">← My Issues</Link><h1 className="mt-4 font-display text-6xl uppercase">New Issue</h1><IssueEditor action={createVenueIssue} articles={articles} ads={ads} restrooms={restrooms} qrCodes={qrCodes} /></main>;
}
