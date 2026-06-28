import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/lib/actions";
import { authEnvStatus, currentUser, dashboardForRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileOnboarding } from "@/components/portal/ProfileOnboarding";

export const dynamic = "force-dynamic";

export default async function VenuePortalPage() {
  const auth = authEnvStatus();
  const user = await currentUser();
  if (auth.isConfigured && !user) redirect("/signin?error=admin_required");
  if (user && user.role !== "VENUE_MANAGER" && user.role !== "ADMIN") return <WrongPortal role={user.role} />;
  try {
    const venue = user?.venueId ? await prisma.venue.findUnique({ where: { id: user.venueId }, include: { restrooms: true, qrCodes: true, events: true } }) : null;
    if (user?.role === "VENUE_MANAGER" && !venue) {
      return <main className="min-h-screen bg-paper p-8 text-ink"><ProfileOnboarding title="Complete your venue profile" endpoint="/api/portal/venue/profile" button="Save Venue Profile" fields={[{ name: "venueName", label: "Venue name" }, { name: "address", label: "Address" }, { name: "city", label: "City" }, { name: "state", label: "State" }, { name: "website", label: "Website", required: false }, { name: "phone", label: "Phone", required: false }]} /></main>;
    }
    return <main className="min-h-screen bg-paper p-8 text-ink"><header className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black uppercase tracking-[.25em] text-stallRed">Venue Portal</p><h1 className="font-display text-6xl uppercase">{venue?.name || "Venue Dashboard"}</h1></div><form action={signOutAction}><button className="rounded-xl bg-ink px-4 py-3 font-black uppercase text-white">Sign out</button></form></header><section className="mt-6 grid gap-4 md:grid-cols-3">{[["Restrooms", venue?.restrooms.length || 0], ["QR Codes", venue?.qrCodes.length || 0], ["Analytics Events", venue?.events.length || 0]].map(([label, value]) => <div key={label} className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal"><p className="font-black uppercase text-stallRed">{label}</p><p className="font-display text-5xl uppercase">{value}</p></div>)}</section><section className="mt-6 grid gap-4 md:grid-cols-3">{[["New Issue", "Create a venue-specific draft or publish it live when ready.", "/portal/venue/issues/new"], ["My Issues", "View, edit, publish, unpublish, or draft your venue issues.", "/portal/venue/issues"], ["Issue Analytics", "Review per-issue views, QR scans, ad impressions, clicks, and activity.", "/portal/venue/issues/analytics"]].map(([label, description, href]) => <Link key={label} href={href} className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal transition hover:-translate-y-1"><p className="font-display text-3xl uppercase">{label}</p><p className="mt-2 font-bold">{description}</p><span className="mt-4 inline-block rounded-xl bg-stallRed px-4 py-2 font-black uppercase text-white">Open</span></Link>)}</section></main>;
  } catch (error) {
    return <main className="min-h-screen bg-paper p-8 text-ink"><div className="rounded-2xl border-4 border-ink bg-stallRed p-5 font-black text-white shadow-brutal">{error instanceof Error ? error.message : "Unable to load venue portal."}</div></main>;
  }
}

function WrongPortal({ role }: { role: any }) {
  const dashboard = dashboardForRole(role);
  return <main className="min-h-screen bg-paper p-8 text-ink"><section className="rounded-2xl border-4 border-ink bg-white p-6 shadow-brutal"><h1 className="font-display text-5xl uppercase">Wrong dashboard</h1><p className="mt-3 font-black">That account cannot access the venue dashboard.</p><Link href={dashboard} className="mt-4 inline-block rounded-xl bg-ink px-4 py-3 font-black uppercase text-white">Go to your dashboard</Link></section></main>;
}
