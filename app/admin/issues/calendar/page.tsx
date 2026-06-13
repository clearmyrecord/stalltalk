import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function IssueCalendarPage() {
  const issues = await prisma.issue.findMany({ include: { publisher: true, venue: true }, orderBy: [{ year: "asc" }, { issueNumber: "asc" }] });
  const groups = new Map<string, typeof issues>();
  for (const issue of issues) {
    const key = `${issue.month} ${issue.year}`;
    groups.set(key, [...(groups.get(key) || []), issue]);
  }
  return <section><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-7xl uppercase">Issue Calendar</h1><Link className="rounded-xl bg-ink px-4 py-3 font-black uppercase text-white" href="/admin/issues">Issue List</Link></div><div className="mt-6 grid gap-4 md:grid-cols-3">{Array.from(groups).map(([month, monthIssues]) => <article key={month} className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal"><h2 className="font-display text-5xl uppercase">{month}</h2><div className="mt-3 grid gap-2">{monthIssues.map((issue) => <Link key={issue.id} className="rounded-xl border-2 border-ink bg-paper p-3 font-black uppercase" href={`/admin/issues/${issue.id}/edit`}><span className="text-stallRed">{issue.status}</span> • {issue.venue?.name || "Global"} • #{issue.issueNumber}</Link>)}</div></article>)}</div></section>;
}
