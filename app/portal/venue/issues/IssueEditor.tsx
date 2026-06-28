import type { Issue } from "@prisma/client";

export function IssueEditor({ action, issue }: { action: (formData: FormData) => Promise<void>; issue?: Issue }) {
  const now = new Date();
  const publishAction = issue?.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
  return <form action={action} className="mt-6 grid gap-4 rounded-2xl border-4 border-ink bg-white p-6 shadow-brutal">
    <p className="rounded-xl bg-stallYellow p-3 font-black text-ink">Save a draft, publish it live, or unpublish it any time. Your issue stays scoped to your linked venue.</p>
    <label className="font-black uppercase">Title<input name="title" required defaultValue={issue?.title || ""} className="mt-1 w-full rounded-xl border-4 border-ink p-3" /></label>
    <div className="grid gap-4 md:grid-cols-3">
      <label className="font-black uppercase">Month<input name="month" required defaultValue={issue?.month || now.toLocaleString("en-US", { month: "long" })} className="mt-1 w-full rounded-xl border-4 border-ink p-3" /></label>
      <label className="font-black uppercase">Year<input name="year" type="number" required defaultValue={issue?.year || now.getFullYear()} className="mt-1 w-full rounded-xl border-4 border-ink p-3" /></label>
      <label className="font-black uppercase">Issue #<input name="issueNumber" type="number" min="1" required defaultValue={issue?.issueNumber || 1} className="mt-1 w-full rounded-xl border-4 border-ink p-3" /></label>
    </div>
    <p className="font-black uppercase text-stallRed">Current status: {issue?.status || "DRAFT"}</p>
    <div className="flex flex-wrap gap-3">
      <button name="status" value="DRAFT" className="rounded-xl bg-ink px-5 py-3 font-black uppercase text-white">Save Draft</button>
      <button name="status" value={publishAction} className="rounded-xl bg-stallRed px-5 py-3 font-black uppercase text-white">{issue?.status === "PUBLISHED" ? "Unpublish Issue" : "Publish Issue"}</button>
    </div>
  </form>;
}
