import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { AdCard, AdPlaceholder } from "@/components/AdCard";
import { ImpressionRecorder } from "@/components/ImpressionRecorder";
import { ScanRecorder } from "@/components/ScanRecorder";
import { getServedAds } from "@/lib/ad-serving";
import { contentLabels } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
type IssueWithContext = Prisma.IssueGetPayload<{ include: { publisher: true; venue: true; restroom: true; qrCode: true; contentBlocks: { include: { article: true } }; adSlots: { include: { ad: true } } } }>;
type ServedAds = Awaited<ReturnType<typeof getServedAds>>;

export default async function IssuePage({ params, searchParams }: { params: Promise<{ venueSlug: string }>; searchParams: Promise<{ qr?: string }> }) {
  const { venueSlug } = await params;
  const { qr } = await searchParams;
  const issue = await prisma.issue.findFirst({
    where: { venue: { slug: venueSlug }, status: "PUBLISHED", ...(qr ? { qrCode: { code: qr } } : {}) },
    orderBy: [{ year: "desc" }, { issueNumber: "desc" }],
    include: { publisher: true, venue: true, restroom: true, qrCode: true, contentBlocks: { include: { article: true }, orderBy: { sortOrder: "asc" } }, adSlots: { include: { ad: true }, orderBy: { slotNumber: "asc" } } }
  });
  if (!issue) notFound();
  const ads = await getServedAds(issue);
  const actualAds = ads.filter((ad): ad is NonNullable<typeof ad> => Boolean(ad));

  return (
    <main className="issue-shell min-h-screen overflow-x-hidden pb-[18rem] text-ink md:pb-0">
      <ScanRecorder publisherId={issue.publisherId} venueId={issue.venueId} restroomId={issue.restroomId} qrCodeId={issue.qrCodeId} issueId={issue.id} />
      <ImpressionRecorder events={actualAds.map((ad) => ({ publisherId: issue.publisherId, venueId: issue.venueId, restroomId: issue.restroomId, qrCodeId: issue.qrCodeId, issueId: issue.id, advertiserId: ad.advertiserId, adId: ad.id, slotNumber: ad.slotNumber }))} />
      <header className="sticky top-0 z-40 border-b-4 border-ink bg-stallYellow px-3 py-2 text-center shadow-lg md:relative md:top-auto md:z-auto md:px-8">
        <p className="text-xs font-black uppercase tracking-[.25em]">{issue.publisher.name} • {issue.venue.name} • {issue.restroom?.name || "Venue-wide"}</p>
        <h1 className="font-display text-5xl uppercase leading-none md:text-7xl">{issue.title}</h1>
        <p className="font-black uppercase">{issue.venue.city}, {issue.venue.state} • {issue.month} {issue.year} • Issue #{issue.issueNumber} • QR {issue.qrCode?.code || "venue"}</p>
      </header>

      <div className="sticky top-[6.5rem] z-30 mx-auto max-w-xl p-2 md:hidden">
        <AdPlacement ads={ads} slotNumber={1} issue={issue} compact />
      </div>

      <div className="mx-auto hidden max-w-[1600px] grid-cols-[230px_minmax(0,1fr)_230px] gap-4 p-4 md:grid xl:grid-cols-[280px_minmax(0,1fr)_280px]">
        <SponsorRail ads={ads} issue={issue} slots={[1, 2, 3, 4]} />
        <IssueContent issue={issue} />
        <SponsorRail ads={ads} issue={issue} slots={[5, 6, 7, 8]} />
      </div>

      <div className="md:hidden">
        <IssueContent issue={issue} mobile />
        <div className="fixed inset-x-0 bottom-0 z-50 border-t-4 border-ink bg-white/95 p-2 shadow-2xl backdrop-blur">
          <p className="mb-2 text-center text-[10px] font-black uppercase tracking-[.25em] text-stallRed">Paid sponsor tray • Ads 2–8 stay visible</p>
          <div className="mb-2 grid grid-cols-8 gap-1" aria-label="All paid sponsor slot labels">
            {ads.map((_, index) => <span key={index} className={`ad-gradient-${index + 1} truncate rounded-md border-2 border-ink px-1 py-1 text-center text-[9px] font-black uppercase text-white`}>Ad {index + 1}</span>)}
          </div>
          <div className="mobile-ad-tray flex gap-2 overflow-x-auto pb-1" aria-label="Sticky sponsor ads 2 through 8">
            {[2, 3, 4, 5, 6, 7, 8].map((slotNumber) => <AdPlacement key={slotNumber} ads={ads} slotNumber={slotNumber} issue={issue} compact chip />)}
          </div>
        </div>
      </div>
    </main>
  );
}

function SponsorRail({ ads, issue, slots }: { ads: ServedAds; issue: IssueWithContext; slots: number[] }) {
  return (
    <aside className="sticky top-4 flex max-h-[calc(100vh-2rem)] flex-col gap-3 overflow-y-auto pr-2" aria-label={`Sticky sponsor rail slots ${slots[0]} through ${slots[slots.length - 1]}`}>
      {slots.map((slotNumber) => <AdPlacement key={slotNumber} ads={ads} slotNumber={slotNumber} issue={issue} compact />)}
    </aside>
  );
}

function AdPlacement({ ads, slotNumber, issue, compact = false, chip = false }: { ads: ServedAds; slotNumber: number; issue: IssueWithContext; compact?: boolean; chip?: boolean }) {
  const ad = ads[slotNumber - 1];
  if (!ad) return <AdPlaceholder slotNumber={slotNumber} chip={chip} />;
  return <AdCard ad={ad} slotNumber={slotNumber} issueId={issue.id} publisherId={issue.publisherId} venueId={issue.venueId} restroomId={issue.restroomId} qrCodeId={issue.qrCodeId} compact={compact} chip={chip} />;
}

function IssueContent({ issue, mobile = false }: { issue: IssueWithContext; mobile?: boolean }) {
  return (
    <section className={`grid min-w-0 gap-4 ${mobile ? "p-3 pb-8" : ""}`}>
      <div className="rounded-[2rem] border-4 border-ink bg-white p-5 shadow-brutal">
        <p className="text-xs font-black uppercase tracking-[.3em] text-stallPurple">Publisher-grade restroom media</p>
        <h2 className="font-display text-6xl uppercase leading-none text-stallRed md:text-8xl">Potty Favor</h2>
        <p className="mt-2 text-xl font-black uppercase">Ad serving priority: restroom &gt; venue &gt; city &gt; global. Paid sponsor inventory remains visible while readers scroll.</p>
      </div>
      {issue.contentBlocks.map((block, index) => (
        <details key={block.id} className="group rounded-[1.5rem] border-4 border-ink bg-paper p-4 shadow-brutal open:bg-white" open={index < 2}>
          <summary className="cursor-pointer list-none">
            <span className="rounded-full bg-ink px-3 py-1 text-xs font-black uppercase tracking-widest text-stallYellow">{contentLabels[block.type]}</span>
            <h3 className="mt-3 font-display text-5xl uppercase leading-none md:text-6xl">{block.title}</h3>
            <p className="mt-2 font-black uppercase text-stallPurple">Tap to {index < 2 ? "collapse" : "expand"}</p>
          </summary>
          <p className="mt-4 whitespace-pre-wrap text-lg font-bold leading-relaxed">{block.body}</p>
        </details>
      ))}
    </section>
  );
}
