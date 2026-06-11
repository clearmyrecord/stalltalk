import { createVenueContentDraft } from "@/lib/actions";
import { authEnvStatus, currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function VenuePortalPage() {
  const auth = authEnvStatus();
  const user = await currentUser();
  const where = user?.role === "VENUE" && user.venueId ? { id: user.venueId } : {};
  try {
    const venues = await prisma.venue.findMany({ where, include: { restrooms: true, qrCodes: true, adSlotInventories: true, venueContentDrafts: { orderBy: { createdAt: "desc" } } }, orderBy: { name: "asc" } });
    return <main className="min-h-screen bg-paper p-4 text-ink md:p-8"><h1 className="font-display text-7xl uppercase">Venue Dashboard</h1><p className="max-w-4xl font-bold">Venue users can view their own properties and draft property-specific content. Global admin content remains locked, and venue content requires admin approval before public publishing.</p>{!auth.isConfigured ? <p className="mt-4 rounded-xl border-4 border-ink bg-stallYellow p-4 font-black">Set AUTH_SECRET and DATABASE_URL to restrict venues to their assigned properties.</p> : null}<div className="mt-6 grid gap-6">{venues.map((venue) => <section key={venue.id} className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal"><p className="text-xs font-black uppercase text-stallRed">{venue.city}, {venue.state}</p><h2 className="font-display text-5xl uppercase">{venue.name}</h2><p className="font-bold">{venue.restrooms.length} restroom(s) • {venue.qrCodes.length} QR code(s) • {venue.adSlotInventories.length} ad slot inventory item(s)</p><form action={createVenueContentDraft} className="mt-4 grid gap-3 rounded-xl bg-paper p-3"><input type="hidden" name="venueId" value={venue.id} /><input name="title" placeholder="Property content title" required className="rounded border-2 border-ink p-3" /><input name="imageUrl" placeholder="Image URL optional" className="rounded border-2 border-ink p-3" /><textarea name="body" placeholder="Draft content for this property" required className="rounded border-2 border-ink p-3" /><button className="rounded bg-ink px-4 py-2 font-black uppercase text-white">Submit for admin approval</button></form><div className="mt-4 grid gap-2">{venue.venueContentDrafts.map((draft) => <article key={draft.id} className="rounded-lg border-2 border-ink p-3"><p className="text-xs font-black uppercase text-stallRed">{draft.approvalStatus}</p><h3 className="font-display text-3xl uppercase">{draft.title}</h3><p className="font-bold">{draft.body}</p></article>)}</div></section>)}</div></main>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "");
    if (!/does not exist|P2021|VenueContentDraft/i.test(message)) throw error;
    return <main className="min-h-screen bg-paper p-8 text-ink"><h1 className="font-display text-7xl uppercase">Venue Dashboard</h1><p className="mt-4 rounded-2xl border-4 border-ink bg-stallYellow p-5 font-black shadow-brutal">Run Prisma migrations to enable venue content draft tables.</p></main>;
  }
}
