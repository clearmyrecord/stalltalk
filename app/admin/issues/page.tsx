import Link from "next/link";
import { archiveIssue, cloneIssue, deleteIssue, publishIssue, unpublishIssue } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { issuePublicPath } from "@/lib/issue-routing";

export const dynamic = "force-dynamic";
export default async function IssuesPage() {
  const issues = await prisma.issue.findMany({ include: { publisher: true, venue: true, restroom: true, qrCode: true, contentBlocks: true, adSlots: true }, orderBy: [{ year: "desc" }, { issueNumber: "desc" }] });
  return (
    <section>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-7xl uppercase">Monthly Issues</h1>
        <Link
          className="rounded-xl bg-ink px-4 py-3 font-black uppercase text-white"
          href="/admin/issues/new"
        >
          New Issue
        </Link>
      </div>

      <div className="mt-6 grid gap-4">
        {issues.map((issue) => (
          <article
            key={issue.id}
            className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-stallRed">
                  {issue.status} • {issue.month} {issue.year} • {issue.publisher?.name || "No publisher"}
                </p>

                <h2 className="font-display text-5xl uppercase">
                  {issue.title} #{issue.issueNumber}
                </h2>

                <p className="font-bold">
                  {issue.venue?.name || "Global Issue"} — {issue.restroom?.name || "Venue-wide"} — QR{" "}
                  {issue.qrCode?.qrSlug || "none"}
                </p>

                <p className="font-black">
                  {issue.contentBlocks.length} blocks • {issue.adSlots.length}/8 manual sponsor placements
                </p>
              </div>

              <div className="flex gap-2">
               <Link
  className="rounded-lg bg-stallYellow px-4 py-2 font-black uppercase"
  href={issuePublicPath(issue as any)}
>
  Preview
</Link>

                <Link
                  className="rounded-lg bg-ink px-4 py-2 font-black uppercase text-white"
                  href={`/admin/issues/${issue.id}/edit`}
                >
                  Edit
                </Link>

                {issue.status === "PUBLISHED" ? <form action={unpublishIssue.bind(null, issue.id)}><button className="rounded-lg bg-stallYellow px-4 py-2 font-black uppercase">Unpublish</button></form> : null}

                <form action={deleteIssue.bind(null, issue.id)}>
                  <button className="rounded-lg bg-stallRed px-4 py-2 font-black uppercase text-white">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
