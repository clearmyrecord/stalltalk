import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/lib/actions";
import { authEnvStatus, currentUser, dashboardForRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PublicIssueUrlActions } from "@/components/PublicIssueUrlActions";
import { ProfileOnboarding } from "@/components/portal/ProfileOnboarding";
import { qrSvgDataUrl } from "@/lib/qr";
import { ensureVenueQrCodes } from "@/lib/venue-qr";
import { dashboardPermanentVenueQrUrl, getDashboardVenueQr } from "@/lib/venue-dashboard-qr";
import { formatInVenueTime } from "@/lib/venue-issue-schedule";
import { resolveNextScheduledIssue, resolveVenueEditorial } from "@/lib/editorial-resolution";

export const dynamic = "force-dynamic";

export default async function VenuePortalPage() {
  const auth = authEnvStatus();
  const user = await currentUser();
  if (auth.isConfigured && !user) redirect("/signin?error=admin_required");
  if (user && user.role !== "VENUE_MANAGER" && user.role !== "ADMIN")
    return <WrongPortal role={user.role} />;
  try {
    const venue = user?.venueId
      ? await prisma.venue.findUnique({
          where: { id: user.venueId },
          select: {
            id: true,
            name: true,
            slug: true,
            publicToken: true,
            restrooms: { select: { id: true } },
            qrCodes: { select: { id: true } },
            events: { select: { id: true } },
            timeZone: true,
            contentMode: true,
          },
        })
      : null;
    const venueQr = venue ? await getDashboardVenueQr(venue.id, prisma, ensureVenueQrCodes) : null;
    const permanentVenueQrUrl = venue ? dashboardPermanentVenueQrUrl(venueQr, venue) : null;
    const now = new Date();
    const [resolvedEditorial, nextVenueIssue, nextPublicIssue] = venue ? await Promise.all([
      resolveVenueEditorial(venue, prisma, now),
      resolveNextScheduledIssue(venue.id, prisma, now, "VENUE"),
      resolveNextScheduledIssue(null, prisma, now, "PUBLIC_NETWORK"),
    ]) : [null, null, null] as const;
    const nextIssue = venue?.contentMode === "VENUE_CUSTOM" ? (nextVenueIssue || nextPublicIssue) : nextPublicIssue;
    if (user?.role === "VENUE_MANAGER" && !venue) {
      return (
        <main className="min-h-screen bg-paper p-8 text-ink">
          <ProfileOnboarding
            title="Complete your venue profile"
            endpoint="/api/portal/venue/profile"
            button="Save Venue Profile"
            fields={[
              { name: "venueName", label: "Venue name" },
              { name: "address", label: "Address" },
              { name: "city", label: "City" },
              { name: "state", label: "State" },
              { name: "website", label: "Website", required: false },
              { name: "phone", label: "Phone", required: false },
            ]}
          />
        </main>
      );
    }
    return (
      <main className="min-h-screen bg-paper p-8 text-ink">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-black uppercase tracking-[.25em] text-stallRed">
              Venue Portal
            </p>
            <h1 className="font-display text-6xl uppercase">
              {venue?.name || "Venue Dashboard"}
            </h1>
          </div>
          <form action={signOutAction}>
            <button className="rounded-xl bg-ink px-4 py-3 font-black uppercase text-white">
              Sign out
            </button>
          </form>
        </header>
        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ["Restrooms", venue?.restrooms.length || 0],
            ["QR Codes", venue?.qrCodes.length || 0],
            ["Analytics Events", venue?.events.length || 0],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal"
            >
              <p className="font-black uppercase text-stallRed">{label}</p>
              <p className="font-display text-5xl uppercase">{value}</p>
            </div>
          ))}
        </section>
        {venue && venueQr && permanentVenueQrUrl ? <section className="mt-6 rounded-2xl border-4 border-ink bg-stallYellow p-5 shadow-brutal" aria-labelledby="permanent-venue-qr-heading"><div className="grid gap-5 lg:grid-cols-[320px_1fr]"><div className="rounded-xl border-4 border-ink bg-white p-4"><img src={qrSvgDataUrl(permanentVenueQrUrl, 512)} alt={`Scannable permanent QR code for ${venue.name}`} className="mx-auto h-64 w-64 bg-white" /></div><div className="grid content-center gap-3"><p className="font-black uppercase tracking-[.25em] text-stallRed">Your Permanent Venue QR</p><h2 id="permanent-venue-qr-heading" className="font-display text-5xl uppercase">Print this QR once</h2><p className="font-bold">This venue-level QR stays on the stable /q route while Public mode, My Venue Issue mode, and scheduled issue transitions change the content behind it.</p><label className="grid gap-2 font-black uppercase">Permanent URL<input readOnly value={permanentVenueQrUrl} className="w-full rounded-lg border-4 border-ink bg-white p-3 font-mono text-sm normal-case" /></label><PublicIssueUrlActions url={permanentVenueQrUrl} qrSlug={venueQr.qrSlug} copyLabel="Copy QR Link" openLabel="Open QR Route" /></div></div></section> : null}
        {venue ? <section className="mt-6 grid gap-4 md:grid-cols-2"><div className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal"><p className="font-black uppercase text-stallRed">Currently displayed issue</p><p className="font-display text-4xl uppercase">{resolvedEditorial?.issue?.title || "Evergreen landing page"}</p><p className="font-bold">Why: {resolvedEditorial?.reason}</p></div><div className="rounded-2xl border-4 border-ink bg-stallYellow p-5 shadow-brutal"><p className="font-black uppercase text-stallRed">Next scheduled issue</p><p className="font-display text-4xl uppercase">{nextIssue?.title || "Nothing scheduled"}</p><p className="font-bold">Starts {formatInVenueTime(nextIssue?.scheduledPublishAt, venue.timeZone)}</p></div></section> : null}
        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            [
              "New Issue",
              "Create a venue-specific draft or publish it live when ready.",
              "/portal/venue/issues/new",
            ],
            [
              "My Issues",
              "View, edit, publish, unpublish, or draft your venue issues.",
              "/portal/venue/issues",
            ],
            [
              "Issue Analytics",
              "Review per-issue views, QR scans, ad impressions, clicks, and activity.",
              "/portal/venue/issues/analytics",
            ],
            [
              "Profile",
              "Edit venue name, address, contact details, description, and logo/image.",
              "/portal/venue/profile",
            ],
          ].map(([label, description, href]) => (
            <Link
              key={label}
              href={href}
              className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal transition hover:-translate-y-1"
            >
              <p className="font-display text-3xl uppercase">{label}</p>
              <p className="mt-2 font-bold">{description}</p>
              <span className="mt-4 inline-block rounded-xl bg-stallRed px-4 py-2 font-black uppercase text-white">
                Open
              </span>
            </Link>
          ))}
        </section>
      </main>
    );
  } catch (error) {
    return (
      <main className="min-h-screen bg-paper p-8 text-ink">
        <div className="rounded-2xl border-4 border-ink bg-stallRed p-5 font-black text-white shadow-brutal">
          {error instanceof Error
            ? error.message
            : "Unable to load venue portal."}
        </div>
      </main>
    );
  }
}

function WrongPortal({ role }: { role: any }) {
  const dashboard = dashboardForRole(role);
  return (
    <main className="min-h-screen bg-paper p-8 text-ink">
      <section className="rounded-2xl border-4 border-ink bg-white p-6 shadow-brutal">
        <h1 className="font-display text-5xl uppercase">Wrong dashboard</h1>
        <p className="mt-3 font-black">
          That account cannot access the venue dashboard.
        </p>
        <Link
          href={dashboard}
          className="mt-4 inline-block rounded-xl bg-ink px-4 py-3 font-black uppercase text-white"
        >
          Go to your dashboard
        </Link>
      </section>
    </main>
  );
}
