import Link from "next/link";
import { PasswordChangeForm } from "@/components/account/PasswordChangeForm";
import { requireVenueManager } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VenueProfileForm } from "./VenueProfileForm";

export const dynamic = "force-dynamic";

export default async function VenueProfilePage() {
  const user = await requireVenueManager();
  const venue = user.venueId
    ? await prisma.venue.findUnique({
        where: { id: user.venueId },
        select: {
          name: true,
          venueType: true,
          address: true,
          city: true,
          state: true,
          zip: true,
          phone: true,
          website: true,
          contactName: true,
          contactEmail: true,
          description: true,
          logoImageUrl: true,
        },
      })
    : null;

  return (
    <main className="min-h-screen bg-paper p-8 text-ink">
      <section className="mx-auto max-w-4xl rounded-2xl border-4 border-ink bg-white p-6 shadow-brutal">
        <p className="font-black uppercase tracking-[.25em] text-stallRed">Venue Portal</p>
        <h1 className="font-display text-6xl uppercase">Profile</h1>
        <p className="mt-2 font-bold">
          {venue
            ? "View and edit the venue profile linked to your account."
            : "No venue is linked to your account yet. Complete this profile to create your venue workspace."}
        </p>
        <Link href="/portal/venue" className="mt-4 inline-flex font-black uppercase text-stallPurple underline">
          Back to Venue Portal
        </Link>
        {!venue ? (
          <div className="mt-6 rounded-xl border-4 border-ink bg-stallYellow p-4 font-black uppercase">
            Complete onboarding to link a venue before managing issues, QR routes, or inventory.
          </div>
        ) : null}
        <VenueProfileForm venue={venue} />
      </section>
      <PasswordChangeForm />
    </main>
  );
}
