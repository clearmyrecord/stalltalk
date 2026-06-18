import Link from "next/link";

export function IssueNotFound({ title = "Issue not found", message = "We could not find a published issue for this venue yet." }: { title?: string; message?: string }) {
  return (
    <main className="min-h-screen bg-paper p-6 text-ink md:p-10">
      <section className="mx-auto max-w-3xl rounded-[2rem] border-4 border-ink bg-white p-6 shadow-brutal">
        <p className="text-xs font-black uppercase tracking-[.3em] text-stallRed">Monthly Issue</p>
        <h1 className="font-display text-6xl uppercase leading-none md:text-8xl">{title}</h1>
        <p className="mt-4 text-lg font-bold">{message}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="rounded-xl bg-ink px-4 py-3 font-black uppercase text-white" href="/issue">View latest issue</Link>
          <Link className="rounded-xl bg-stallYellow px-4 py-3 font-black uppercase" href="/admin/issues">Manage issues</Link>
        </div>
      </section>
    </main>
  );
}
