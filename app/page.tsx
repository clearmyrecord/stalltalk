export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";

async function loadHomepageData() {
  try {
    const [venue, slots] = await Promise.all([
      prisma.venue.findFirst({ where: { slug: "mgm-grand-las-vegas" }, include: { qrCodes: true } }),
      prisma.stalltalkAdSlot.findMany({ orderBy: { slotNumber: "asc" }, take: 8 })
    ]);
    return { venue, slots, diagnostic: "Database connected" };
  } catch (error) {
    console.error("Homepage Prisma data load failed", error);
    return { venue: null, slots: [], diagnostic: "Demo mode: database records are unavailable, so placeholder slots are shown." };
  }
}

export default async function Home() {
  const { venue, slots, diagnostic } = await loadHomepageData();
  const qr = venue?.qrCodes[0]?.code;
  return (
    <main className="min-h-screen bg-ink text-white">
      <section className="relative overflow-hidden px-5 py-8 md:px-12 md:py-16">
        <div className="absolute inset-0 opacity-30 halftone" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <p className="mb-4 inline-flex rounded-full bg-stallYellow px-4 py-2 text-sm font-black uppercase tracking-[.25em] text-ink">AI-powered restroom advertising agency</p>
            <h1 className="font-display text-7xl uppercase leading-[.78] tracking-tight text-stallYellow md:text-9xl">Stall Talk</h1>
            <p className="mt-5 max-w-2xl text-2xl font-black uppercase text-white md:text-4xl">Create real marketing graphics with AI, preview every campaign size, and publish professional sponsor ads into eight persistent Potty Favor ad slots.</p>
            <p className="mt-4 max-w-2xl rounded-xl border-4 border-white/80 bg-ink/70 p-3 text-sm font-black uppercase text-stallYellow">{diagnostic}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link className="rounded-xl border-4 border-stallYellow bg-stallRed px-6 py-4 font-black uppercase text-white shadow-brutal" href={venue ? `/issue/${venue.slug}${qr ? `?qr=${qr}` : ""}` : "/admin"}>Preview QR Issue</Link>
              <Link className="rounded-xl border-4 border-white bg-stallPurple px-6 py-4 font-black uppercase text-white shadow-brutal" href="/login">Login to AI Ad Studio</Link>
            </div>
          </div>
          <div className="rounded-[2rem] border-8 border-white bg-paper p-4 text-ink shadow-purple rotate-1">
            <div className="grid grid-cols-2 gap-3">
              {["Business", "Offer", "Audience", "Creative", "AI Image", "Preview", "Publish", "Analytics"].map((label, i) => <div key={label} className={`ad-gradient-${i + 1} rounded-2xl border-4 border-ink p-4 text-center font-display text-3xl uppercase text-white`}>{label}</div>)}
            </div>
            <div className="mt-4 rounded-2xl border-4 border-ink bg-white p-5">
              <h2 className="font-display text-5xl uppercase">Ads create themselves.</h2>
              <p className="font-bold">The guided studio turns business details, offers, audience, tone, and visual direction into multi-size campaign artwork ready for Stall Talk slots.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-paper px-5 py-12 text-ink md:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[.3em] text-stallPurple">Live Published Creative</p>
              <h2 className="font-display text-6xl uppercase leading-none text-stallRed">Homepage Ad Slots</h2>
            </div>
            <Link className="rounded-xl border-4 border-ink bg-stallYellow px-4 py-3 font-black uppercase shadow-brutal" href="/login">Generate New Ad</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => {
              const slotNumber = index + 1;
              const slot = slots.find((item) => item.slotNumber === slotNumber);
              return <HomeSlot key={slotNumber} slotNumber={slotNumber} slot={slot} />;
            })}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-12 text-ink md:px-12">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-4">
          {[
            "Guided campaign builder",
            "OpenAI image generation",
            "Multi-size creative output",
            "One-click slot publishing"
          ].map((item) => <div key={item} className="rounded-2xl border-4 border-ink bg-paper p-5 shadow-brutal"><h3 className="font-display text-3xl uppercase">{item}</h3><p className="font-bold">Built into the Phase 2 AI creative agency workflow with PostgreSQL-ready Prisma models.</p></div>)}
        </div>
      </section>
    </main>
  );
}

type HomeSlotProps = {
  slotNumber: number;
  slot?: {
    business: string;
    creativeType: string;
    image: string | null;
    htmlCreative: string | null;
    videoUrl: string | null;
    headline: string | null;
    subheadline: string | null;
    ctaText: string | null;
    couponCode: string | null;
  };
};

function HomeSlot({ slotNumber, slot }: HomeSlotProps) {
  return (
    <article className="rounded-2xl border-4 border-ink bg-white p-3 shadow-brutal">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="rounded-full bg-ink px-2 py-1 text-[10px] font-black uppercase tracking-widest text-stallYellow">Slot {slotNumber}</span>
        <span className="rounded-full bg-stallPurple px-2 py-1 text-[10px] font-black uppercase text-white">{slot?.creativeType || "Ready"}</span>
      </div>
      <div className="h-40 overflow-hidden rounded-xl border-2 border-ink bg-ink">
        {slot?.creativeType === "VIDEO" && slot.videoUrl ? <video className="h-full w-full object-cover" src={slot.videoUrl} autoPlay muted loop playsInline /> : null}
        {slot?.creativeType === "IMAGE" && slot?.image ? <img className="h-full w-full object-cover" src={slot.image} alt={`${slot.business} ad`} /> : null}
        {slot && slot.creativeType !== "IMAGE" ? <div className="grid h-full place-items-center p-4 text-center font-black uppercase text-stallRed">Image creative required</div> : null}
        {!slot ? <div className={`ad-gradient-${slotNumber} grid h-full place-items-center p-4 text-center font-display text-4xl uppercase text-white`}>Open Slot</div> : null}
      </div>
      <h3 className="mt-3 truncate font-display text-3xl uppercase leading-none" title={slot?.business || "Available Sponsor"}>{slot?.business || "Available Sponsor"}</h3>
      <p className="line-clamp-2 break-words font-black uppercase text-stallRed">{slot?.headline || "Generate an AI ad"}</p>
      <p className="line-clamp-2 break-words text-sm font-bold">{slot?.subheadline || "Publish from the AI Creative Studio."}</p>
      <p className="mt-2 rounded-lg bg-stallYellow px-2 py-1 text-center text-xs font-black uppercase">{slot?.ctaText || "Claim Slot"} {slot?.couponCode ? `• ${slot.couponCode}` : ""}</p>
    </article>
  );
}
