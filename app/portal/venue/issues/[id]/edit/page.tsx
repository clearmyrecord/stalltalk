import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateVenueIssue } from "@/lib/actions";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IssueEditor } from "../../IssueEditor";

export default async function EditVenueIssuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/signin?error=admin_required");
  if (!user.venueId) redirect("/portal/venue/issues");
  const issue = await prisma.issue.findFirst({ where: { id, venueId: user.venueId }, include: { venue: true } });
  if (!issue?.venue) notFound();
  return <main className="min-h-screen bg-paper p-8 text-ink"><Link href="/portal/venue/issues" className="font-black uppercase text-stallRed">← My Issues</Link><h1 className="mt-4 font-display text-6xl uppercase">Edit Issue</h1><IssueEditor action={updateVenueIssue.bind(null, issue.id)} issue={issue} venue={issue.venue} /></main>;
}
