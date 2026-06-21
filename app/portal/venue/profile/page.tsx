import Link from "next/link";
import { PasswordChangeForm } from "@/components/account/PasswordChangeForm";
import { requireVenueManager } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function VenueProfilePage() {
  const user = await requireVenueManager();
  const venue = user.venueId ? await prisma.venue.findUnique({ where: { id: user.venueId } }) : null;
  return <main className="min-h-screen bg-paper p-8 text-ink"><section className="mx-auto max-w-3xl rounded-2xl border-4 border-ink bg-white p-6 shadow-brutal"><p className="font-black uppercase tracking-[.25em] text-stallRed">Venue Portal</p><h1 className="font-display text-6xl uppercase">Profile</h1><p className="mt-2 font-bold">{venue?.name || user.email}</p><Link href="/portal/venue" className="mt-4 inline-flex font-black uppercase text-stallPurple underline">Back to Venue Portal</Link></section><PasswordChangeForm /></main>;
}
