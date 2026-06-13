import Link from "next/link";
import { notFound } from "next/navigation";
import { IssueForm } from "@/components/IssueForm";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export default async function EditIssuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [issue, publishers, venues, restrooms, qrCodes, articles, ads] = await Promise.all([prisma.issue.findUnique({ where: { id }, include: { venue: true, qrCode: true, history: { orderBy: { createdAt: "desc" }, take: 20 }, contentBlocks: { orderBy: { sortOrder: "asc" } }, adSlots: true } }), prisma.publisher.findMany(), prisma.venue.findMany(), prisma.restroom.findMany(), prisma.qrCode.findMany(), prisma.article.findMany(), prisma.ad.findMany({ orderBy: { businessName: "asc" } })]);
  if (!issue) notFound();
  return <section><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-7xl uppercase">Edit Issue</h1><Link className="rounded-xl bg-stallYellow px-4 py-3 font-black uppercase" href={issue.venue ? `/issue/${issue.venue.slug}${issue.qrCode ? `?qr=${issue.qrCode.code}` : ""}` : "/issue"}>Preview Public Issue</Link></div><IssueForm publishers={publishers} venues={venues} restrooms={restrooms} qrCodes={qrCodes} articles={articles} ads={ads} issue={issue} /><section className="mt-6 rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal"><h2 className="font-display text-5xl uppercase">Issue History</h2><div className="mt-3 grid gap-2">{issue.history.map((event) => <p key={event.id} className="font-bold"><span className="font-black uppercase text-stallRed">{event.action}</span> {event.fromStatus || "NEW"} → {event.toStatus || "—"} • {event.createdAt.toISOString()}</p>)}</div></section></section>;
}
