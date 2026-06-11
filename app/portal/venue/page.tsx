import Link from "next/link";
import { createRestroom } from "@/lib/actions";
import { requireUser, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function VenuePortalPage() {
  const user = await requireUser(["ADMIN", "VENUE"]);
  const venues = await prisma.venue.findMany({
    where: user.role === "VENUE" ? { id: user.venueId || "" } : undefined,
    include: { restrooms: true, qrCodes: true, issues: { orderBy: { createdAt: "desc" }, take: 5 } },
    orderBy: { name: "asc" }
  });

  return (
    <main className="min-h-screen bg-paper p-4 text-ink md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[.3em] text-stallPurple">Venue workspace</p>
          <h1 className="font-display text-7xl uppercase">Venue Portal</h1>
          <p className="font-bold">Venue accounts can view assigned QR inventory, add restroom locations, and jump into live issue previews.</p>
        </div>
        <form action={signOut}><button className="rounded-xl border-4 border-ink bg-stallRed px-4 py-3 font-black uppercase text-white shadow-brutal">Logout {user.name}</button></form>
      </div>
      <div className="mt-6 grid gap-6">
        {venues.map((venue) => (
          <section key={venue.id} className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal">
            <p className="text-xs font-black uppercase text-stallRed">{venue.city}, {venue.state}</p>
            <h2 className="font-display text-5xl uppercase">{venue.name}</h2>
            <p className="font-bold">{venue.address}</p>
            <div className="my-4 grid gap-3 md:grid-cols-3">
              <Stat label="Restrooms" value={venue.restrooms.length} />
              <Stat label="QR codes" value={venue.qrCodes.length} />
              <Stat label="Recent issues" value={venue.issues.length} />
            </div>
            <form action={createRestroom} className="grid gap-2 rounded-xl border-2 border-ink bg-paper p-3 md:grid-cols-4">
              <input type="hidden" name="venueId" value={venue.id} />
              <input name="name" required placeholder="Restroom name" className="rounded border-2 border-ink p-2" />
              <input name="floor" placeholder="Floor" className="rounded border-2 border-ink p-2" />
              <input name="placement" placeholder="QR placement note" className="rounded border-2 border-ink p-2" />
              <button className="rounded bg-stallRed p-2 font-black uppercase text-white">Add restroom</button>
            </form>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border-2 border-ink p-3">
                <h3 className="font-display text-3xl uppercase">Restrooms</h3>
                {venue.restrooms.map((restroom) => <p key={restroom.id} className="font-bold">{restroom.name} {restroom.floor ? `• ${restroom.floor}` : ""}</p>)}
              </div>
              <div className="rounded-xl border-2 border-ink p-3">
                <h3 className="font-display text-3xl uppercase">QR Issue Links</h3>
                {venue.qrCodes.map((qr) => <Link key={qr.id} className="block font-black uppercase text-stallPurple" href={qr.destination}>{qr.label}</Link>)}
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border-2 border-ink bg-paper p-3"><p className="font-black uppercase text-stallRed">{label}</p><p className="font-display text-4xl">{value}</p></div>;
}
