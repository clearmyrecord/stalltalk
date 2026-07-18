import Link from "next/link";
import { redirect } from "next/navigation";
import { assignVenueIssueToQr, makeCurrentVenueIssue, setVenueIssueStatus, updateVenueContentMode } from "@/lib/actions";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileOnboarding } from "@/components/portal/ProfileOnboarding";
import { PublicIssueUrlActions } from "@/components/PublicIssueUrlActions";
import { issuePublicUrl } from "@/lib/issue-routing";
import { restroomLabelSelect } from "@/lib/restroom-schema";
import { ensureVenueQrCodes, permanentQrUrl } from "@/lib/venue-qr";
import { resolveNextScheduledIssue, resolvePublicIssue, resolveVenueEditorial } from "@/lib/editorial-resolution";
import { computeIssueState, formatInVenueTime } from "@/lib/venue-issue-schedule";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

export const dynamic = "force-dynamic";

export default async function VenueIssuesPage({ searchParams }: { searchParams?: Promise<{ saved?: string; published?: string; unpublished?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/signin?error=admin_required");
  if (user.role !== "VENUE_MANAGER" && user.role !== "ADMIN") redirect("/portal/venue");
  const query = searchParams ? await searchParams : {};
  if (user.venueId) await ensureVenueQrCodes(user.venueId);
  const venue = user.venueId ? await prisma.venue.findUnique({ where: { id: user.venueId }, include: { qrCodes: { include: { restroom: { select: { ...restroomLabelSelect, restroomType: true } } }, orderBy: [{ qrType: "asc" }, { qrName: "asc" }] }, issues: { where: { editorialScope: "VENUE" }, include: { venue: { select: { slug: true } }, restroom: { select: { slug: true, name: true } }, issueTargets: true }, orderBy: { updatedAt: "desc" } } } }) : null;
  if (!venue) return <main className="min-h-screen bg-paper p-8 text-ink"><ProfileOnboarding title="Link your venue to manage issues" endpoint="/api/portal/venue/profile" button="Save Venue Profile" fields={[{ name: "venueName", label: "Venue name" }, { name: "address", label: "Address" }, { name: "city", label: "City" }, { name: "state", label: "State" }]} /></main>;

  const now = new Date();
  const displayed = await resolveVenueEditorial(venue, prisma, now);
  const currentPublic = await resolvePublicIssue(prisma, now);
  const nextVenue = await resolveNextScheduledIssue(venue.id, prisma, now, "VENUE");
  const nextPublic = await resolveNextScheduledIssue(null, prisma, now, "PUBLIC_NETWORK");
  const nextScheduled = venue.contentMode === "VENUE_CUSTOM" ? (nextVenue || nextPublic) : nextPublic;
  const assignedByIssue = new Map<string, typeof venue.qrCodes>();
  for (const qr of venue.qrCodes) if (qr.issueId) assignedByIssue.set(qr.issueId, [...(assignedByIssue.get(qr.issueId) || []), qr]);
  const venueWideQr = venue.qrCodes.find((qr) => qr.qrType === "VENUE" && !qr.restroomId) || venue.qrCodes.find((qr) => !qr.restroomId);
  const mensQr = venue.qrCodes.find((qr) => /men/i.test(qr.restroom?.name || "") && !/women/i.test(qr.restroom?.name || ""));
  const womensQr = venue.qrCodes.find((qr) => /women|ladies/i.test(qr.restroom?.name || ""));
  const allRestroomsQr = venueWideQr;
  const routeLabel = (qr: (typeof venue.qrCodes)[number]) => qr.restroom ? `${qr.restroom.name} QR` : "All Restrooms QR";
  const permanentRoute = permanentQrUrl(venueWideQr, venue);

  return <main className="min-h-screen bg-paper p-8 text-ink">
    {query.saved ? <p className="mb-4 rounded-xl border-4 border-ink bg-stallYellow p-3 font-black uppercase">Settings saved.</p> : null}
    {query.published ? <p className="mb-4 rounded-xl border-4 border-ink bg-stallYellow p-3 font-black uppercase">Issue published.</p> : null}
    {query.unpublished ? <p className="mb-4 rounded-xl border-4 border-ink bg-stallYellow p-3 font-black uppercase">Issue unpublished.</p> : null}
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black uppercase tracking-[.25em] text-stallRed">My Issues</p><h1 className="font-display text-6xl uppercase">{venue.name}</h1><p className="font-bold">Your permanent QR route never changes; this page controls which editorial issue it displays.</p></div><Link href="/portal/venue/issues/new" className="rounded-xl bg-stallRed px-4 py-3 font-black uppercase text-white">New Venue Issue</Link></header>

    <section className="mt-6 grid gap-4 rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal">
      <h2 className="font-display text-4xl uppercase">Content displayed by your QR</h2>
      <p className="font-bold">Public: Your QR automatically displays the current Potty Favor issue.</p>
      <p className="font-bold">Custom: Your QR displays your currently published venue issue. If none is live, it displays the Potty Favor issue.</p>
      <div className="grid gap-3 md:grid-cols-2">
        <form action={updateVenueContentMode.bind(null, venue.id, "PUBLIC")} className={`rounded-xl border-4 p-4 ${venue.contentMode === "PUBLIC" ? "border-stallRed bg-stallYellow" : "border-ink bg-paper"}`}><h3 className="font-black uppercase">Potty Favor Public Issue</h3><p className="text-sm font-bold">Current selection: {venue.contentMode === "PUBLIC" ? "Yes" : "No"}</p><ConfirmSubmitButton message="Switch this venue QR to the Potty Favor Public Issue? Venue issues will remain saved but will not display." className="mt-3 rounded bg-ink px-3 py-2 font-black uppercase text-white" disabled={venue.contentMode === "PUBLIC"}>Switch to Public</ConfirmSubmitButton></form>
        <form action={updateVenueContentMode.bind(null, venue.id, "VENUE_CUSTOM")} className={`rounded-xl border-4 p-4 ${venue.contentMode === "VENUE_CUSTOM" ? "border-stallRed bg-stallYellow" : "border-ink bg-paper"}`}><h3 className="font-black uppercase">My Venue Issue</h3><p className="text-sm font-bold">Current selection: {venue.contentMode === "VENUE_CUSTOM" ? "Yes" : "No"}</p><ConfirmSubmitButton message="Switch this venue QR to My Venue Issue? If no venue issue is live, the public issue will still display." className="mt-3 rounded bg-ink px-3 py-2 font-black uppercase text-white" disabled={venue.contentMode === "VENUE_CUSTOM"}>Switch to My Venue Issue</ConfirmSubmitButton></form>
      </div>
      <div className="grid gap-2 rounded-xl border-2 border-ink bg-paper p-4">
        <p className="font-black uppercase">Currently displayed issue: {displayed.issue?.title || "Evergreen venue landing page"}</p>
        <p className="font-bold">Why: {displayed.reason}</p>
        <p className="font-bold">Next scheduled issue: {nextScheduled?.title || "None"} {nextScheduled?.scheduledPublishAt ? `(${formatInVenueTime(nextScheduled.scheduledPublishAt, venue.timeZone)})` : ""}</p>
        <p className="font-bold">Current Potty Favor public issue: {currentPublic?.title || "None"}</p>
        <p className="font-bold">Permanent QR route:</p><input readOnly value={permanentRoute} className="w-full rounded-lg border-2 border-ink bg-white p-2 font-mono text-sm" />
        <p className="text-sm font-black uppercase text-stallPurple">Changing modes does not alter QR tokens, routes, scan history, marketplace inventory, or paid sponsor assignments.</p>
        {venue.contentMode === "PUBLIC" ? <p className="rounded-lg bg-stallYellow p-3 font-bold">Your venue issues remain saved and scheduled, but they will not display until you switch back to My Venue Issue.</p> : null}
      </div>
    </section>

    <section className="mt-6 grid gap-4"><div className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal"><h2 className="font-display text-4xl uppercase">Permanent QR Routing Assets</h2><p className="font-bold">Permanent QR links to print. They stay stable as content mode and schedules change.</p><div className="mt-3 grid gap-3 md:grid-cols-2">{venue.qrCodes.map((qr) => <div key={qr.id} className="rounded-xl border-2 border-ink bg-paper p-3"><p className="font-black uppercase">{routeLabel(qr)}</p><p className="text-sm font-bold">Direct assignment: {venue.issues.find((issue) => issue.id === qr.issueId)?.title || "No direct assignment"}</p><input readOnly value={permanentQrUrl(qr, venue)} className="mt-2 w-full rounded-lg border-2 border-ink bg-white p-2 font-mono text-sm" /><PublicIssueUrlActions url={permanentQrUrl(qr, venue)} qrSlug={qr.qrSlug} copyLabel="Copy QR Link" openLabel="Open Public Issue" /></div>)}</div></div>
    {venue.contentMode === "VENUE_CUSTOM" ? venue.issues.map((issue) => { const assigned = assignedByIssue.get(issue.id) || []; const state = computeIssueState(issue, now); return <article key={issue.id} className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display text-3xl uppercase">{issue.title}</h2><p className="font-black uppercase text-stallRed">{state} • {issue.status} • {issue.month} {issue.year}</p><p className="mt-2 font-bold">Assigned routes: {assigned.length ? assigned.map(routeLabel).join(", ") : "Venue schedule/fallback only"}</p>{issue.slug || issue.id ? <div className="mt-3 grid gap-2 rounded-xl border-2 border-ink bg-paper p-3"><p className="text-xs font-black uppercase tracking-[.2em] text-stallPurple">Historical Issue URL — preview/archive only, do not print as a QR sticker</p><input readOnly value={issuePublicUrl(issue)} className="w-full rounded-lg border-2 border-ink bg-white p-2 font-mono text-sm" /><PublicIssueUrlActions url={issuePublicUrl(issue)} /></div> : null}</div><div className="flex max-w-xl flex-wrap gap-2"><Link href={`/portal/venue/issues/${issue.id}/edit`} className="rounded-xl border-4 border-ink px-4 py-2 font-black uppercase">Edit / Schedule</Link><Link href={`/issue/${issue.slug}?previewIssueId=${issue.id}`} className="rounded-xl border-4 border-ink px-4 py-2 font-black uppercase">Preview</Link><Link href={`/portal/venue/issues/analytics#${issue.id}`} className="rounded-xl border-4 border-ink px-4 py-2 font-black uppercase">Analytics</Link>{mensQr ? <form action={assignVenueIssueToQr.bind(null, issue.id, mensQr.id)}><button className="rounded-xl bg-blue-700 px-4 py-2 font-black uppercase text-white">Target Men's QR</button></form> : null}{womensQr ? <form action={assignVenueIssueToQr.bind(null, issue.id, womensQr.id)}><button className="rounded-xl bg-stallPurple px-4 py-2 font-black uppercase text-white">Target Women's QR</button></form> : null}{allRestroomsQr ? <form action={makeCurrentVenueIssue.bind(null, issue.id)}><button className="rounded-xl bg-green-700 px-4 py-2 font-black uppercase text-white">Make Venue Issue</button></form> : null}<form action={setVenueIssueStatus.bind(null, issue.id, issue.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED")}><button className="rounded-xl bg-ink px-4 py-2 font-black uppercase text-white">{issue.status === "PUBLISHED" ? "End Live Early" : "Publish Now"}</button></form></div></div></article>; }) : <div className="rounded-2xl border-4 border-ink bg-white p-6 shadow-brutal"><h2 className="font-display text-4xl uppercase">Venue issues archived while Public mode is selected</h2><p className="font-black">Drafts, scheduled issues, ended issues, and canceled issues are preserved. Switch to My Venue Issue to create or display venue issues again.</p></div>}
    {venue.contentMode === "VENUE_CUSTOM" && !venue.issues.length && <div className="rounded-2xl border-4 border-ink bg-white p-6 shadow-brutal"><h2 className="font-display text-4xl uppercase">No venue issues yet</h2><p className="font-black">Create your first draft issue for this venue.</p></div>}</section>
  </main>;
}
