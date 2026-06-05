import Link from "next/link";
import { contentLabels } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function IssueBuilderPage() {
  const issue = await prisma.issue.findFirst({ include: { venue: true, contentBlocks: { orderBy: { sortOrder: "asc" } }, adSlots: { include: { ad: true } } }, orderBy: { createdAt: "desc" } });

  return (
    <section>
      <h1 className="font-display text-7xl uppercase">Issue Builder</h1>
      <p className="max-w-4xl font-bold">Drag-and-drop planning surface for monthly restroom issues. The MVP stores block order and layout JSON; use Edit Issue to persist each drop-zone assignment.</p>
      {issue ? (
        <>
          <div className="mt-4 flex gap-3">
            <Link className="rounded bg-ink px-4 py-3 font-black uppercase text-white" href={`/admin/issues/${issue.id}/edit`}>Edit {issue.title}</Link>
            <Link className="rounded bg-stallYellow px-4 py-3 font-black uppercase" href={`/issue/${issue.venue.slug}`}>Preview</Link>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="grid gap-4 md:grid-cols-2">
              {issue.contentBlocks.map((block, index) => <article key={block.id} draggable className="cursor-grab rounded-2xl border-4 border-dashed border-ink bg-white p-5 shadow-brutal"><p className="text-xs font-black uppercase text-stallRed">Drop zone {index + 1} • {contentLabels[block.type]}</p><h2 className="font-display text-4xl uppercase">{block.title}</h2><p className="font-bold line-clamp-3">{block.body}</p></article>)}
            </div>
            <aside className="rounded-2xl border-4 border-ink bg-stallYellow p-5 shadow-brutal">
              <h2 className="font-display text-4xl uppercase">Ad Slots 1–8</h2>
              {Array.from({ length: 8 }, (_, index) => {
                const slot = issue.adSlots.find((candidate) => candidate.slotNumber === index + 1);
                return <p key={index} className="mt-2 rounded bg-white p-3 font-black">Slot {index + 1}: {slot?.ad.businessName || "Auto serve"}</p>;
              })}
            </aside>
          </div>
          <StickyInventoryPreview slots={Array.from({ length: 8 }, (_, index) => ({ slotNumber: index + 1, name: issue.adSlots.find((slot) => slot.slotNumber === index + 1)?.ad.businessName || "Premium inventory" }))} />
        </>
      ) : <p className="mt-8 rounded-2xl border-4 border-ink bg-white p-5 font-black shadow-brutal">Create an issue first.</p>}
    </section>
  );
}

function StickyInventoryPreview({ slots }: { slots: Array<{ slotNumber: number; name: string }> }) {
  return (
    <section className="mt-8 rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal">
      <p className="text-xs font-black uppercase tracking-[.3em] text-stallPurple">Preview tab</p>
      <h2 className="font-display text-5xl uppercase">Sticky sponsor preview</h2>
      <p className="mb-5 font-black uppercase text-stallRed">Paid sponsor inventory remains visible while readers scroll.</p>
      <div className="grid gap-5 xl:grid-cols-2">
        <div>
          <p className="mb-2 font-black uppercase">Desktop rails: Slots 1–4 left, Slots 5–8 right</p>
          <div className="issue-shell grid max-h-[34rem] grid-cols-[8rem_1fr_8rem] gap-3 overflow-y-auto rounded-2xl border-4 border-ink p-3">
            <div className="sticky top-4 flex flex-col gap-2 self-start">{slots.slice(0, 4).map((slot) => <PreviewAd key={slot.slotNumber} {...slot} />)}</div>
            <div className="grid gap-3">
              {Array.from({ length: 6 }, (_, index) => <div key={index} className="rounded-2xl border-4 border-ink bg-paper p-4"><p className="rounded-full bg-ink px-3 py-1 text-xs font-black uppercase tracking-widest text-stallYellow">Article {index + 1}</p><h3 className="mt-2 font-display text-4xl uppercase">Reader content scrolls here</h3><p className="font-bold">Sponsor rails stay pinned and do not overlap the article column.</p></div>)}
            </div>
            <div className="sticky top-4 flex flex-col gap-2 self-start">{slots.slice(4, 8).map((slot) => <PreviewAd key={slot.slotNumber} {...slot} />)}</div>
          </div>
        </div>
        <div>
          <p className="mb-2 font-black uppercase">Mobile: Ad 1 top, Ads 2–8 bottom tray</p>
          <div className="issue-shell relative h-[34rem] overflow-hidden rounded-[2rem] border-4 border-ink bg-paper p-3 pb-28">
            <div className="sticky top-0 z-10"><PreviewAd {...slots[0]} /></div>
            <div className="mt-3 grid gap-3 overflow-hidden">
              {Array.from({ length: 4 }, (_, index) => <div key={index} className="rounded-2xl border-4 border-ink bg-white p-4"><h3 className="font-display text-3xl uppercase">Mobile article {index + 1}</h3><p className="font-bold">Readable content keeps bottom padding for the sticky sponsor tray.</p></div>)}
            </div>
            <div className="absolute inset-x-0 bottom-0 border-t-4 border-ink bg-white/95 p-2">
              <div className="mobile-ad-tray flex gap-2 overflow-x-auto pb-1">{slots.slice(1).map((slot) => <PreviewAd key={slot.slotNumber} {...slot} chip />)}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PreviewAd({ slotNumber, name, chip = false }: { slotNumber: number; name: string; chip?: boolean }) {
  return <div className={`${chip ? "min-w-[7rem]" : ""} rounded-xl border-2 border-ink bg-white p-2 shadow-brutal`}><p className="rounded-full bg-ink px-2 py-1 text-[10px] font-black uppercase tracking-widest text-stallYellow">Ad {slotNumber}</p><div className={`ad-gradient-${slotNumber} mt-2 grid h-12 place-items-center rounded-lg border-2 border-ink px-2 text-center text-xs font-black uppercase text-white`}>{name}</div></div>;
}
