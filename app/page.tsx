import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const venue = await prisma.venue.findFirst({ where: { slug: "mgm-grand-las-vegas" }, include: { qrCodes: true } });
  const qr = venue?.qrCodes[0]?.code;
  return (
    <main className="min-h-screen bg-ink text-white">
      <section className="relative overflow-hidden px-5 py-8 md:px-12 md:py-16">
        <div className="absolute inset-0 opacity-30 halftone" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <p className="mb-4 inline-flex rounded-full bg-stallYellow px-4 py-2 text-sm font-black uppercase tracking-[.25em] text-ink">Publisher-grade restroom media SaaS</p>
            <h1 className="font-display text-7xl uppercase leading-[.78] tracking-tight text-stallYellow md:text-9xl">Stall Talk</h1>
            <p className="mt-5 max-w-2xl text-2xl font-black uppercase text-white md:text-4xl">Multi-tenant QR inventory, restroom-level ad serving, monthly issue publishing, portals, analytics, and Stripe-ready subscriptions.</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link className="rounded-xl border-4 border-stallYellow bg-stallRed px-6 py-4 font-black uppercase text-white shadow-brutal" href={venue ? `/issue/${venue.slug}${qr ? `?qr=${qr}` : ""}` : "/admin"}>Preview QR Issue</Link>
              <Link className="rounded-xl border-4 border-white bg-stallPurple px-6 py-4 font-black uppercase text-white shadow-brutal" href="/admin">Open Platform</Link>
            </div>
          </div>
          <div className="rounded-[2rem] border-8 border-white bg-paper p-4 text-ink shadow-purple rotate-1">
            <div className="grid grid-cols-2 gap-3">
              {["Publisher", "Distributor", "Venue", "Restroom", "QR Code", "Issue", "Ad Serve", "Analytics"].map((label, i) => <div key={label} className={`ad-gradient-${i + 1} rounded-2xl border-4 border-ink p-4 text-center font-display text-3xl uppercase text-white`}>{label}</div>)}
            </div>
            <div className="mt-4 rounded-2xl border-4 border-ink bg-white p-5">
              <h2 className="font-display text-5xl uppercase">Ads stay visible.</h2>
              <p className="font-bold">Restroom, venue, city, and global campaigns fill eight persistent sponsor positions with scan, impression, click, coupon, and visitor analytics.</p>
            </div>
          </div>
        </div>
      </section>
      <section className="bg-paper px-5 py-12 text-ink md:px-12">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-4">
          {["Multi-tenant hierarchy", "QR inventory", "Issue builder", "Advertiser + distributor portals"].map((item) => <div key={item} className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal"><h3 className="font-display text-3xl uppercase">{item}</h3><p className="font-bold">Built into the Phase 2 SaaS platform with PostgreSQL-ready Prisma models.</p></div>)}
        </div>
      </section>
    </main>
  );
}
