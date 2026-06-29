import Link from "next/link";
import { redirect } from "next/navigation";
import { createVenueIssue } from "@/lib/actions";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileOnboarding } from "@/components/portal/ProfileOnboarding";
import { IssueEditor, type VenueIssueDraft } from "../IssueEditor";

function emptyState(title: string, body: string) {
  return <main className="min-h-screen bg-paper p-8 text-ink"><Link href="/portal/venue/issues" className="font-black uppercase text-stallRed">← My Issues</Link><section className="mt-6 rounded-2xl border-4 border-ink bg-white p-6 shadow-brutal"><h1 className="font-display text-5xl uppercase">{title}</h1><p className="mt-3 font-black">{body}</p></section></main>;
}

export default async function NewVenueIssuePage() {
  const user = await currentUser();
  if (!user) redirect("/signin?error=admin_required");
  const venue = user.venueId ? await prisma.venue.findUnique({ where: { id: user.venueId }, select: { id: true, name: true, slug: true, publisherId: true } }) : null;
  if (!venue) return <main className="min-h-screen bg-paper p-8 text-ink"><ProfileOnboarding title="Link your venue before creating issues" endpoint="/api/portal/venue/profile" button="Save Venue Profile" fields={[{ name: "venueName", label: "Venue name" }, { name: "address", label: "Address" }, { name: "city", label: "City" }, { name: "state", label: "State" }]} /></main>;

  try {
    const now = new Date();
    const draftIssue: VenueIssueDraft = {
      title: `${venue.name} Potty Favor`,
      month: now.toLocaleString("en-US", { month: "long" }),
      year: now.getFullYear(),
      issueNumber: 1,
      status: "DRAFT",
      restroomId: null,
      qrCodeId: null,
      venue: { slug: venue.slug },
      contentBlocks: [],
      adSlots: [],
    };
    const [articles, ads, restrooms, qrCodes] = await Promise.all([
      prisma.article.findMany({ where: { publisherId: venue.publisherId, OR: [{ venueIds: { has: venue.id } }, { venueIds: { isEmpty: true } }] }, select: { id: true, title: true }, orderBy: { updatedAt: "desc" } }),
      prisma.ad.findMany({ where: { status: "ACTIVE", scope: { in: ["VENUE", "RESTROOM"] }, OR: [{ venueId: venue.id }, { venueIds: { has: venue.id } }, { restroom: { venueId: venue.id } }] }, select: { id: true, businessName: true, scope: true }, orderBy: { updatedAt: "desc" } }),
      prisma.restroom.findMany({ where: { venueId: venue.id, status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.qrCode.findMany({ where: { venueId: venue.id }, select: { id: true, qrName: true, restroomId: true }, orderBy: { qrName: "asc" } }),
    ]);
    return <main className="min-h-screen bg-paper p-8 text-ink"><Link href="/portal/venue/issues" className="font-black uppercase text-stallRed">← My Issues</Link><h1 className="mt-4 font-display text-6xl uppercase">New Issue</h1>{!restrooms.length || !qrCodes.length ? <p className="mt-4 rounded-xl border-4 border-ink bg-stallYellow p-4 font-black uppercase">You can save a venue-wide draft now. Restroom and QR selectors will appear after active restrooms/QR codes are added for this venue.</p> : null}<IssueEditor action={createVenueIssue} issue={draftIssue} articles={articles} ads={ads} restrooms={restrooms} qrCodes={qrCodes} /></main>;
  } catch (error) {
    console.error("[venue-new-issue]", error);
    return emptyState("Issue builder unavailable", "We could not load the venue issue builder data. Your venue is linked, but articles, ads, restrooms, or QR codes may still be missing or mid-migration. Please try again after your venue setup is complete.");
  }
}
