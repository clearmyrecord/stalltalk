import type { Issue, Venue } from "@prisma/client";

export function IssueEditor({ action, issue, venue }: { action: (formData: FormData) => Promise<void>; issue?: Issue; venue: Pick<Venue, "directPublishingApproved"> }) {
  const now = new Date();
  return <form action={action} className="mt-6 grid gap-4 rounded-2xl border-4 border-ink bg-white p-6 shadow-brutal">
    {!venue.directPublishingApproved && <p className="rounded-xl bg-yellow-100 p-3 font-black text-ink">Publishing approval is pending. Saved issues will remain drafts until StallTalk enables direct publishing for your venue.</p>}
    <label className="font-black uppercase">Title<input name="title" required defaultValue={issue?.title || ""} className="mt-1 w-full rounded-xl border-4 border-ink p-3" /></label>
    <div className="grid gap-4 md:grid-cols-3">
      <label className="font-black uppercase">Month<input name="month" required defaultValue={issue?.month || now.toLocaleString("en-US", { month: "long" })} className="mt-1 w-full rounded-xl border-4 border-ink p-3" /></label>
      <label className="font-black uppercase">Year<input name="year" type="number" required defaultValue={issue?.year || now.getFullYear()} className="mt-1 w-full rounded-xl border-4 border-ink p-3" /></label>
      <label className="font-black uppercase">Issue #<input name="issueNumber" type="number" min="1" required defaultValue={issue?.issueNumber || 1} className="mt-1 w-full rounded-xl border-4 border-ink p-3" /></label>
    </div>
    <label className="font-black uppercase">Status<select name="status" defaultValue={issue?.status || "DRAFT"} className="mt-1 w-full rounded-xl border-4 border-ink p-3">
      <option value="DRAFT">Draft</option>
      <option value="PUBLISHED" disabled={!venue.directPublishingApproved}>Published</option>
    </select></label>
    <button className="rounded-xl bg-stallRed px-5 py-3 font-black uppercase text-white">Save Issue</button>
  </form>;
}
