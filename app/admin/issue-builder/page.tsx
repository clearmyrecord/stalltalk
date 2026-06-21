import Link from "next/link";
import { contentLabels } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { SPONSOR_PLACEMENTS, sponsorPlacementLabel } from "@/lib/sponsor-placements";

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
            <Link className="rounded bg-stallYellow px-4 py-3 font-black uppercase" href={issue.venue ? `/issue/${issue.venue.slug}` : "/issue"}>Preview</Link>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="grid gap-4 md:grid-cols-2">
              {issue.contentBlocks.map((block, index) => <article key={block.id} draggable className="cursor-grab rounded-2xl border-4 border-dashed border-ink bg-white p-5 shadow-brutal"><p className="text-xs font-black uppercase text-stallRed">Drop zone {index + 1} • {contentLabels[block.type]}</p><h2 className="font-display text-4xl uppercase">{block.title}</h2><p className="font-bold line-clamp-3">{block.body}</p></article>)}
            </div>
            <aside className="rounded-2xl border-4 border-ink bg-stallYellow p-5 shadow-brutal">
              <h2 className="font-display text-4xl uppercase">8 Premium Sponsor Panels</h2>
              {Array.from({ length: 8 }, (_, index) => {
                const slot = issue.adSlots.find((candidate) => candidate.slotNumber === index + 1);
                return <p key={index} className="mt-2 rounded bg-white p-3 font-black">{sponsorPlacementLabel(index + 1)}: {slot?.ad.businessName || "Auto serve"}</p>;
              })}
            </aside>
          </div>
          <InlineInventoryPreview slots={SPONSOR_PLACEMENTS.map((placement) => ({ slotNumber: placement.number, name: issue.adSlots.find((slot) => slot.slotNumber === placement.number)?.ad.businessName || "Premium inventory" }))} />
        </>
      ) : <p className="mt-8 rounded-2xl border-4 border-ink bg-white p-5 font-black shadow-brutal">Create an issue first.</p>}
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
        <PreviewSection label="Funny Article" />
        <PreviewAd {...slots[1]} />
        <PreviewSection label="Restaurant Review" />
        <PreviewAd {...slots[2]} />
        <PreviewSection label="Events" />
        <PreviewAd {...slots[3]} />
        <PreviewSection label="Local Deals" />
        <PreviewAd {...slots[4]} />
        <PreviewSection label="Trivia" />
        <PreviewAd {...slots[5]} />
        <PreviewSection label="Community" />
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
