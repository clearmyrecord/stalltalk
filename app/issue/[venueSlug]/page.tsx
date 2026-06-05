import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { AdCard } from "@/components/AdCard";
import { ImpressionRecorder } from "@/components/ImpressionRecorder";
import { ScanRecorder } from "@/components/ScanRecorder";
import { getServedAds } from "@/lib/ad-serving";
import { contentLabels } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
type IssueWithContext = Prisma.IssueGetPayload<{ include: { publisher: true; venue: true; restroom: true; qrCode: true; contentBlocks: { include: { article: true } } } }>;

export default async function IssuePage({ params, searchParams }: { params: Promise<{ venueSlug: string }>; searchParams: Promise<{ qr?: string }> }) {
  const { venueSlug } = await params;
  const { qr } = await searchParams;
  const issue = await prisma.issue.findFirst({
    where: { venue: { slug: venueSlug }, status: "PUBLISHED", ...(qr ? { qrCode: { code: qr } } : {}) },
    orderBy: [{ year: "desc" }, { issueNumber: "desc" }],
    include: { publisher: true, venue: true, restroom: true, qrCode: true, contentBlocks: { include: { article: true }, orderBy: { sortOrder: "asc" } } }
  });
  if (!issue) notFound();
  const ads = await getServedAds(issue);
  const top = ads[0];
  const bottom = ads[1] || ads[0];
  return (
    <main className="issue-shell min-h-screen pb-[24rem] text-ink md:pb-0">
      <ScanRecorder publisherId={issue.publisherId} venueId={issue.venueId} restroomId={issue.restroomId} qrCodeId={issue.qrCodeId} issueId={issue.id} />
      <ImpressionRecorder events={ads.map((ad) => ({ publisherId: issue.publisherId, venueId: issue.venueId, restroomId: issue.restroomId, qrCodeId: issue.qrCodeId, issueId: issue.id, advertiserId: ad.advertiserId, adId: ad.id, slotNumber: ad.slotNumber }))} />
      <header className="sticky top-0 z-40 border-b-4 border-ink bg-stallYellow px-3 py-2 text-center shadow-lg md:px-8">
        <p className="text-xs font-black uppercase tracking-[.25em]">{issue.publisher.name} • {issue.venue.name} • {issue.restroom?.name || "Venue-wide"}</p>
        <h1 className="font-display text-5xl uppercase leading-none md:text-7xl">{issue.title}</h1>
        <p className="font-black uppercase">{issue.venue.city}, {issue.venue.state} • {issue.month} {issue.year} • Issue #{issue.issueNumber} • QR {issue.qrCode?.code || "venue"}</p>
      </header>

      {top ? <div className="sticky top-[6.8rem] z-30 mx-auto max-w-xl p-2 md:hidden"><AdCard ad={top} slotNumber={1} issueId={issue.id} publisherId={issue.publisherId} venueId={issue.venueId} restroomId={issue.restroomId} qrCodeId={issue.qrCodeId} compact /></div> : null}

      <div className="mx-auto hidden max-w-[1540px] grid-cols-[250px_1fr_250px] gap-4 p-5 md:grid lg:grid-cols-[300px_1fr_300px]">
        <aside className="sticky top-32 flex h-[calc(100vh-9rem)] flex-col gap-4 overflow-y-auto pr-2">{ads.slice(0, 4).map((ad, i) => <AdCard key={`${ad.id}-${i}`} ad={ad} slotNumber={i + 1} issueId={issue.id} publisherId={issue.publisherId} venueId={issue.venueId} restroomId={issue.restroomId} qrCodeId={issue.qrCodeId} compact />)}</aside>
        <IssueContent issue={issue} ads={ads} />
        <aside className="sticky top-32 flex h-[calc(100vh-9rem)] flex-col gap-4 overflow-y-auto pr-2">{ads.slice(4, 8).map((ad, i) => <AdCard key={`${ad.id}-${i + 4}`} ad={ad} slotNumber={i + 5} issueId={issue.id} publisherId={issue.publisherId} venueId={issue.venueId} restroomId={issue.restroomId} qrCodeId={issue.qrCodeId} compact />)}</aside>
      </div>

      <div className="md:hidden">
        <IssueContent issue={issue} ads={ads} mobile />
        {bottom ? <div className="fixed inset-x-0 bottom-0 z-50 border-t-4 border-ink bg-white/95 p-2 shadow-2xl backdrop-blur"><p className="mb-1 text-center text-[10px] font-black uppercase tracking-[.25em] text-stallRed">Sticky bottom sponsor + all 8 ad positions</p><div className="mb-2 grid grid-cols-8 gap-1">{ads.map((ad, i) => <div key={`${ad.id}-pill-${i}`} className={`ad-gradient-${i + 1} truncate rounded-md border-2 border-ink px-1 py-1 text-center text-[9px] font-black uppercase text-white`}>{i + 1}</div>)}</div><AdCard ad={bottom} slotNumber={2} issueId={issue.id} publisherId={issue.publisherId} venueId={issue.venueId} restroomId={issue.restroomId} qrCodeId={issue.qrCodeId} compact /></div> : null}
      </div>
    </main>
  );
}

function IssueContent({ issue, ads, mobile = false }: { issue: IssueWithContext; ads: Awaited<ReturnType<typeof getServedAds>>; mobile?: boolean }) {
  return (
    <section className={`grid gap-4 ${mobile ? "p-3" : ""}`}>
      <div className="rounded-[2rem] border-4 border-ink bg-white p-5 shadow-brutal">
        <p className="text-xs font-black uppercase tracking-[.3em] text-stallPurple">Publisher-grade restroom media</p>
        <h2 className="font-display text-6xl uppercase leading-none text-stallRed md:text-8xl">Potty Favor</h2>
        <p className="mt-2 text-xl font-black uppercase">Ad serving priority: restroom &gt; venue &gt; city &gt; global. Sponsors never disappear.</p>
      </div>
      {issue.contentBlocks.map((block, index) => (
        <div key={block.id}>
          {mobile && ads[index % Math.max(ads.length, 1)] ? <div className="mb-4"><AdCard ad={ads[index % ads.length]} slotNumber={(index % 8) + 1} issueId={issue.id} publisherId={issue.publisherId} venueId={issue.venueId} restroomId={issue.restroomId} qrCodeId={issue.qrCodeId} compact /></div> : null}
          <details className="group rounded-[1.5rem] border-4 border-ink bg-paper p-4 shadow-brutal open:bg-white" open={index < 2}>
            <summary className="cursor-pointer list-none">
              <span className="rounded-full bg-ink px-3 py-1 text-xs font-black uppercase tracking-widest text-stallYellow">{contentLabels[block.type]}</span>
              <h3 className="mt-3 font-display text-5xl uppercase leading-none md:text-6xl">{block.title}</h3>
              <p className="mt-2 font-black uppercase text-stallPurple">Tap to {index < 2 ? "collapse" : "expand"}</p>
            </summary>
            <p className="mt-4 whitespace-pre-wrap text-lg font-bold leading-relaxed">{block.body}</p>
          </details>
        </div>
      ))}
    </section>
  );
}
