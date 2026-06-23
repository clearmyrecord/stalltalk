import Link from "next/link";
import { contentLabels } from "@/lib/format";
import { getDefaultIssue } from "@/lib/default-issue";
import { SPONSOR_PLACEMENTS, sponsorPlacementLabel } from "@/lib/sponsor-placements";

export const dynamic = "force-dynamic";

export default async function IssueBuilderPage() {
  let issue = null;
  let error = null;
  try {
    issue = await getDefaultIssue({ createIfMissing: true });
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
  }

  return (
    <section>
      <h1 className="font-display text-7xl uppercase">Issue Builder</h1>
      <p className="max-w-4xl font-bold">Drag-and-drop planning surface for monthly restroom issues. The MVP stores block order and layout JSON; use Edit Issue to persist each drop-zone assignment.</p>
      {error ? <p className="mt-8 rounded-2xl border-4 border-red-800 bg-red-100 p-5 font-black text-red-950 shadow-brutal">Default issue unavailable. Using temporary fallback. Issue Builder could not load the Neon default issue: {error}</p> : issue ? (
        <>
          {issue.fallbackMessage ? <p className="mt-6 rounded-2xl border-4 border-stallRed bg-white p-5 font-black text-stallRed shadow-brutal">{issue.fallbackMessage}</p> : null}
          <div className="mt-6 grid gap-4 rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal md:grid-cols-3">
            <div className="md:col-span-3">
              <h2 className="font-display text-5xl uppercase">Publishing Schedule</h2>
              <p className="font-bold">Build next month in advance from the Schedule dashboard. Raw Schedule ISO is hidden; admins choose date, time, and timezone instead.</p>
            </div>
            <label className="grid gap-1 font-black uppercase">Issue Title<input defaultValue={issue.title} readOnly className="rounded border-2 border-ink p-3 font-bold normal-case" /></label>
            <label className="grid gap-1 font-black uppercase">Slug<input defaultValue={issue.slug} readOnly className="rounded border-2 border-ink p-3 font-bold normal-case" /></label>
            <label className="grid gap-1 font-black uppercase">Timezone<input defaultValue="America/Los_Angeles" readOnly className="rounded border-2 border-ink p-3 font-bold normal-case" /></label>
            <label className="grid gap-1 font-black uppercase">Publish Date<input type="date" className="rounded border-2 border-ink p-3 font-bold normal-case" /></label>
            <label className="grid gap-1 font-black uppercase">Publish Time<input type="time" className="rounded border-2 border-ink p-3 font-bold normal-case" /></label>
            <div className="grid gap-2 font-black uppercase">
              <label><input type="checkbox" defaultChecked /> Auto Publish</label>
              <label><input type="checkbox" defaultChecked /> Replace Default Global Issue</label>
              <label><input type="checkbox" defaultChecked /> Archive Previous Issue</label>
            </div>
            <Link className="rounded bg-ink px-4 py-3 text-center font-black uppercase text-white md:col-span-3" href="/admin/schedule">Schedule Next Month</Link>
          </div>
          <div className="mt-4 flex gap-3">
            <Link className="rounded bg-ink px-4 py-3 font-black uppercase text-white" href="/admin/default-issue">Edit {issue.title}</Link>
            <Link className="rounded bg-stallYellow px-4 py-3 font-black uppercase" href="/issue">Preview</Link>
          </div>
          <section className="mt-6 grid gap-4 rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal md:grid-cols-3"><div className="md:col-span-3"><h2 className="font-display text-5xl uppercase">Publishing Schedule</h2><p className="font-bold">Use Schedule Next Month to duplicate the active issue, pick date/time, and auto-publish. Raw Schedule ISO is hidden.</p></div><label className="grid gap-1 font-black uppercase">Issue Title<input className="rounded border-2 border-ink p-3" defaultValue={issue.title}/></label><label className="grid gap-1 font-black uppercase">Slug<input className="rounded border-2 border-ink p-3" defaultValue={issue.slug}/></label><label className="grid gap-1 font-black uppercase">Publish Date<input type="date" className="rounded border-2 border-ink p-3"/></label><label className="grid gap-1 font-black uppercase">Publish Time<input type="time" className="rounded border-2 border-ink p-3"/></label><label className="grid gap-1 font-black uppercase">Timezone<input className="rounded border-2 border-ink p-3" defaultValue="America/Los_Angeles"/></label><label className="flex items-center gap-2 font-black uppercase"><input type="checkbox"/> Auto Publish</label><label className="flex items-center gap-2 font-black uppercase"><input type="checkbox" defaultChecked/> Replace Default Global Issue</label><label className="flex items-center gap-2 font-black uppercase"><input type="checkbox" defaultChecked/> Archive Previous Issue</label><Link className="rounded bg-ink px-4 py-3 text-center font-black uppercase text-white" href="/admin/schedule">Schedule Next Month</Link></section><div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="grid gap-4 md:grid-cols-2">
              {issue.contentBlocks.map((block, index) => <article key={block.id} draggable className="cursor-grab rounded-2xl border-4 border-dashed border-ink bg-white p-5 shadow-brutal"><p className="text-xs font-black uppercase text-stallRed">Drop zone {index + 1} • {contentLabels[block.type as keyof typeof contentLabels] || block.type}</p><h2 className="font-display text-4xl uppercase">{block.title}</h2><p className="font-bold line-clamp-3">{block.body}</p></article>)}
            </div>
            <aside className="rounded-2xl border-4 border-ink bg-stallYellow p-5 shadow-brutal">
              <h2 className="font-display text-4xl uppercase">8 Premium Sponsor Panels</h2>
              {Array.from({ length: 8 }, (_, index) => {
                const slot = issue.adSlots.find((candidate) => candidate.slotNumber === index + 1);
                return <p key={index} className="mt-2 rounded bg-white p-3 font-black">{sponsorPlacementLabel(index + 1)}: {slot?.ad?.businessName || "Auto serve"}</p>;
              })}
            </aside>
          </div>
          <InlineInventoryPreview slots={SPONSOR_PLACEMENTS.map((placement) => ({ slotNumber: placement.number, name: issue.adSlots.find((slot) => slot.slotNumber === placement.number)?.ad?.businessName || "Premium inventory" }))} />
        </>
      ) : <p className="mt-8 rounded-2xl border-4 border-ink bg-white p-5 font-black shadow-brutal">No default issue exists yet. Refresh to auto-create the Potty Favor June Issue, or check Neon connectivity.</p>}
    </section>
  );
}

function InlineInventoryPreview({ slots }: { slots: Array<{ slotNumber: number; name: string }> }) {
  return (
    <section className="mt-8 rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal">
      <p className="text-xs font-black uppercase tracking-[.3em] text-stallPurple">Preview tab</p>
      <h2 className="font-display text-5xl uppercase">Inline sponsor preview</h2>
      <p className="mb-5 font-black uppercase text-stallRed">Paid sponsor inventory is placed inside the publication reading flow.</p>
      <div className="issue-shell grid max-h-[42rem] gap-3 overflow-y-auto rounded-2xl border-4 border-ink bg-paper p-3">
        <PreviewSection label="Header" />
        <PreviewSection label="Mission" />
        <PreviewAd {...slots[0]} />
        <PreviewSection label="Hilariously Funny" />
        <PreviewAd {...slots[1]} />
        <PreviewSection label="Feature Article" />
        <PreviewSection label="Restaurant Review" />
        <PreviewAd {...slots[2]} />
        <PreviewSection label="Event Calendar" />
        <PreviewAd {...slots[3]} />
        <PreviewSection label="Local Deals" />
        <PreviewAd {...slots[4]} />
        <PreviewSection label="Trivia / Did You Know" />
        <PreviewAd {...slots[5]} />
        <PreviewSection label="Inspirational Quotes" />
        <PreviewSection label="Word of the Month" />
        <PreviewAd {...slots[6]} />
        <PreviewAd {...slots[7]} />
      </div>
    </section>
  );
}

function PreviewSection({ label }: { label: string }) {
  return <div className="rounded-2xl border-4 border-ink bg-white p-4"><p className="rounded-full bg-ink px-3 py-1 text-xs font-black uppercase tracking-widest text-stallYellow">Publication content</p><h3 className="mt-2 font-display text-4xl uppercase">{label}</h3></div>;
}

function PreviewAd({ slotNumber, name }: { slotNumber: number; name: string }) {
  return <div className="rounded-2xl border-4 border-ink bg-white p-4 shadow-brutal"><p className="rounded-full bg-ink px-2 py-1 text-[10px] font-black uppercase tracking-widest text-stallYellow">{sponsorPlacementLabel(slotNumber)}</p><div className={`ad-gradient-${slotNumber} mt-3 grid min-h-28 place-items-center rounded-xl border-2 border-ink px-4 text-center text-xl font-black uppercase text-white`}>{name}</div></div>;
}
