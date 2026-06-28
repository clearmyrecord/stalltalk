import Link from "next/link";
import { redirect } from "next/navigation";
import { setVenueIssueStatus } from "@/lib/actions";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileOnboarding } from "@/components/portal/ProfileOnboarding";

export const dynamic = "force-dynamic";

export default async function VenueIssuesPage() {
  const user = await currentUser();
  if (!user) redirect("/signin?error=admin_required");
  if (user.role !== "VENUE_MANAGER" && user.role !== "ADMIN") redirect("/portal/venue");
  const venue = user.venueId ? await prisma.venue.findUnique({ where: { id: user.venueId }, include: { issues: { orderBy: { updatedAt: "desc" } } } }) : null;
  if (!venue) return <main className="min-h-screen bg-paper p-8 text-ink"><ProfileOnboarding title="Link your venue to manage issues" endpoint="/api/portal/venue/profile" button="Save Venue Profile" fields={[{ name: "venueName", label: "Venue name" }, { name: "address", label: "Address" }, { name: "city", label: "City" }, { name: "state", label: "State" }]} /></main>;
  return <main className="min-h-screen bg-paper p-8 text-ink"><header className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black uppercase tracking-[.25em] text-stallRed">My Issues</p><h1 className="font-display text-6xl uppercase">{venue.name}</h1></div><Link href="/portal/venue/issues/new" className="rounded-xl bg-stallRed px-4 py-3 font-black uppercase text-white">New Issue</Link></header><section className="mt-6 grid gap-4">{venue.issues.map((issue) => <article key={issue.id} className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-3xl uppercase">{issue.title}</h2><p className="font-black uppercase text-stallRed">{issue.status} • {issue.month} {issue.year}</p></div><div className="flex flex-wrap gap-2"><Link href={`/portal/venue/issues/${issue.id}/edit`} className="rounded-xl border-4 border-ink px-4 py-2 font-black uppercase">Edit</Link><Link href={`/portal/venue/issues/analytics#${issue.id}`} className="rounded-xl border-4 border-ink px-4 py-2 font-black uppercase">Analytics</Link><form action={setVenueIssueStatus.bind(null, issue.id, issue.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED")}><button className="rounded-xl bg-ink px-4 py-2 font-black uppercase text-white">{issue.status === "PUBLISHED" ? "Unpublish Issue" : "Publish Issue"}</button></form></div></div></article>)}{!venue.issues.length && <div className="rounded-2xl border-4 border-ink bg-white p-6 shadow-brutal"><h2 className="font-display text-4xl uppercase">No venue issues yet</h2><p className="font-black">Create your first draft issue for this venue.</p></div>}</section></main>;
}
