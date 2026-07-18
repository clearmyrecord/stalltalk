import type { Ad, Article, Issue, IssueAdSlot, IssueContentBlock, QrCode } from "@prisma/client";
import { SPONSOR_PLACEMENTS } from "@/lib/sponsor-placements";
import { contentLabels } from "@/lib/format";
import { issuePublicPath, issuePublicUrl } from "@/lib/issue-routing";
import { PublicIssueUrlActions } from "@/components/PublicIssueUrlActions";
import { computeIssueState, formatInVenueTime, timeZoneAbbreviation } from "@/lib/venue-issue-schedule";

type EditorArticle = Pick<Article, "id" | "title">;
type EditorAd = Pick<Ad, "id" | "businessName" | "scope">;
type EditorRestroom = { id: string; name: string };
type EditorQrCode = Pick<QrCode, "id" | "qrName" | "restroomId">;

export type VenueIssueDraft = Partial<Pick<Issue, "id" | "title" | "month" | "year" | "issueNumber" | "status" | "restroomId" | "qrCodeId" | "slug" | "scheduledPublishAt">> & { contentBlocks?: IssueContentBlock[]; adSlots?: (IssueAdSlot & { ad?: Ad })[]; issueTargets?: any[]; venue?: { slug: string; timeZone?: string } | null };
type VenueIssue = Issue & { contentBlocks?: IssueContentBlock[]; adSlots?: (IssueAdSlot & { ad?: Ad })[]; issueTargets?: any[]; venue?: { slug: string; timeZone?: string } | null };

const CONTENT_ZONES = [
  ["mission", "MISSION"], ["funny", "HILARIOUSLY_FUNNY"], ["feature", "FEATURE_ARTICLE"], ["restaurant", "RESTAURANT_REVIEW"], ["events", "EVENT_CALENDAR"], ["deals", "LOCAL_DEALS"], ["trivia", "TRIVIA"], ["quote", "INSPIRATIONAL_QUOTES"], ["community", "WORD_OF_THE_MONTH"],
] as const;
const zoneOptions = CONTENT_ZONES.map(([, type]) => ({ value: type, label: contentLabels[type as keyof typeof contentLabels] || type }));

export function IssueEditor({ action, issue, articles = [], ads = [], restrooms = [], qrCodes = [], timeZone = "America/Los_Angeles" }: { action: (formData: FormData) => Promise<void>; issue?: VenueIssue | VenueIssueDraft; articles?: EditorArticle[]; ads?: EditorAd[]; restrooms?: EditorRestroom[]; qrCodes?: EditorQrCode[]; timeZone?: string }) {
  const now = new Date();
  const blocks = CONTENT_ZONES.map(([key], index) => issue?.contentBlocks?.find((block) => (block.layout as any)?.key === key) || issue?.contentBlocks?.find((block) => block.sortOrder === index + 1));
  const issueId = issue?.id || null;
  const previewHref = issueId ? `${issuePublicPath(issue as any)}?previewIssueId=${encodeURIComponent(issueId)}` : null;
  const publicIssueUrl = issueId && (issue?.slug || issue?.id) ? issuePublicUrl(issue as any) : null;
  const firstTarget = issue?.issueTargets?.[0];
  const state = computeIssueState(issue as any, now);
  const tzAbbr = timeZoneAbbreviation(timeZone, firstTarget?.publishAt || now);
  return <form action={action} className="mt-6 grid gap-5">
    <section className="grid gap-4 rounded-2xl border-4 border-ink bg-white p-6 shadow-brutal">
      <p className="rounded-xl bg-stallYellow p-3 font-black text-ink">Build a complete Potty Favor issue for your linked venue only. Public/global ads and admin-only data are not exposed here.</p>
      {publicIssueUrl ? <div className="grid gap-2 rounded-xl border-4 border-ink bg-paper p-4"><p className="text-xs font-black uppercase tracking-[.2em] text-stallPurple">Public Issue URL</p><input readOnly value={publicIssueUrl} className="w-full rounded-lg border-2 border-ink bg-white p-2 font-mono text-sm" /><PublicIssueUrlActions url={publicIssueUrl} /><p className="text-xs font-bold uppercase text-ink">Only published issues are visible publicly. Drafts require an authorized venue/admin preview.</p></div> : null}
      {previewHref ? <a className="w-fit rounded-xl border-4 border-ink bg-stallYellow px-5 py-3 font-black uppercase" href={previewHref} target="_blank">Preview Issue</a> : null}
      <label className="font-black uppercase">Title<input name="title" required defaultValue={issue?.title || "Potty Favor"} className="mt-1 w-full rounded-xl border-4 border-ink p-3" /></label>
      <div className="grid gap-4 md:grid-cols-5">
        <label className="font-black uppercase">Month<input name="month" required defaultValue={issue?.month || now.toLocaleString("en-US", { month: "long" })} className="mt-1 w-full rounded-xl border-4 border-ink p-3" /></label>
        <label className="font-black uppercase">Year<input name="year" type="number" required defaultValue={issue?.year || now.getFullYear()} className="mt-1 w-full rounded-xl border-4 border-ink p-3" /></label>
        <label className="font-black uppercase">Issue #<input name="issueNumber" type="number" min="1" required defaultValue={issue?.issueNumber || 1} className="mt-1 w-full rounded-xl border-4 border-ink p-3" /></label>
        <label className="font-black uppercase">Restroom<select name="restroomId" defaultValue={issue?.restroomId || ""} className="mt-1 w-full rounded-xl border-4 border-ink p-3"><option value="">Venue-wide</option>{restrooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
        <label className="font-black uppercase">QR<select name="qrCodeId" defaultValue={issue?.qrCodeId || ""} className="mt-1 w-full rounded-xl border-4 border-ink p-3"><option value="">No QR</option>{qrCodes.map((q) => <option key={q.id} value={q.id}>{q.qrName}</option>)}</select></label>
      </div>
      <div className="grid gap-3 rounded-xl border-4 border-ink bg-stallYellow p-4"><p className="font-black uppercase text-stallRed">Computed status: {state}</p><p className="font-bold">Venue time zone: {timeZone} ({tzAbbr}). Publish: {formatInVenueTime(firstTarget?.publishAt || (issue as any)?.scheduledPublishAt, timeZone)}. End: {formatInVenueTime(firstTarget?.unpublishAt, timeZone)}.</p><div className="grid gap-3 md:grid-cols-4"><label className="font-black uppercase">Publish mode<select name="publishMode" defaultValue={(issue as any)?.isScheduled ? "later" : "now"} className="mt-1 w-full rounded-xl border-4 border-ink p-3"><option value="now">Publish now</option><option value="later">Schedule for later</option></select></label><label className="font-black uppercase">Publication date<input name="publishDate" type="date" defaultValue={dateValue(firstTarget?.publishAt || (issue as any)?.scheduledPublishAt, timeZone)} className="mt-1 w-full rounded-xl border-4 border-ink p-3" /></label><label className="font-black uppercase">Publication time<input name="publishTime" type="time" defaultValue={timeValue(firstTarget?.publishAt || (issue as any)?.scheduledPublishAt, timeZone)} className="mt-1 w-full rounded-xl border-4 border-ink p-3" /></label><label className="font-black uppercase">Optional end date<input name="unpublishDate" type="date" defaultValue={dateValue(firstTarget?.unpublishAt, timeZone)} className="mt-1 w-full rounded-xl border-4 border-ink p-3" /></label><label className="font-black uppercase">Optional end time<input name="unpublishTime" type="time" defaultValue={timeValue(firstTarget?.unpublishAt, timeZone)} className="mt-1 w-full rounded-xl border-4 border-ink p-3" /></label></div><p className="font-bold uppercase">Overlapping schedules are allowed; the latest qualifying publication time wins. Use Cancel Schedule or End Live Early to stop this issue.</p></div>
    </section>

    <section className="rounded-2xl border-4 border-ink bg-stallYellow p-5 shadow-brutal">
      <h2 className="font-display text-5xl uppercase">Content Sections</h2>
      <p className="mb-4 font-bold">Add mission text, features, event/calendar copy, restaurant reviews, deals, trivia, quotes, and images. Drag-style ordering is handled by the sort order fields.</p>
      <div className="grid gap-4 md:grid-cols-2">{blocks.map((block, i) => { const [layoutKey, defaultType] = CONTENT_ZONES[i]; return <div key={layoutKey} className="grid gap-3 rounded-xl border-2 border-ink bg-white p-3">
        <div className="flex items-center justify-between gap-3"><p className="font-display text-3xl uppercase">Section {i + 1}</p><label className="text-xs font-black uppercase">Sort<input name={`blockSortOrder${i + 1}`} type="number" min="1" defaultValue={block?.sortOrder || i + 1} className="ml-2 w-20 rounded border-2 border-ink p-2" /></label></div>
        <input type="hidden" name={`blockLayoutKey${i + 1}`} value={layoutKey} />
        <select name={`blockType${i + 1}`} defaultValue={block?.type || defaultType} className="rounded border-2 border-ink p-2 font-black">{zoneOptions.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select>
        <select name={`blockArticle${i + 1}`} defaultValue={block?.articleId || ""} className="rounded border-2 border-ink p-2"><option value="">No linked article</option>{articles.map((article) => <option key={article.id} value={article.id}>{article.title}</option>)}</select>
        <input name={`blockTitle${i + 1}`} defaultValue={block?.title || ""} placeholder="Title / headline" className="rounded border-2 border-ink p-2" />
        <textarea name={`blockBody${i + 1}`} defaultValue={block?.body || ""} placeholder={layoutKey === "mission" ? "Mission text" : "Body"} rows={5} className="rounded border-2 border-ink p-2" />
        <input name={`blockImage${i + 1}`} defaultValue={block?.imageUrl || ""} placeholder="Image URL (paste an existing upload URL)" className="rounded border-2 border-ink p-2" />
      </div>})}</div>
    </section>

    <section className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal">
      <h2 className="font-display text-5xl uppercase">Venue Sponsor Preview</h2>
      <p className="mb-3 font-bold">Only ads scoped to your venue/restrooms are selectable; global network ads remain admin-controlled.</p>
      <div className="grid gap-3 md:grid-cols-4">{SPONSOR_PLACEMENTS.map((placement) => <label key={placement.number} className="grid gap-1 font-black uppercase">{placement.label}<select name={`slot${placement.number}`} defaultValue={issue?.adSlots?.find((slot) => slot.slotNumber === placement.number)?.adId || ""} className="rounded border-2 border-ink p-3"><option value="">Auto serve</option>{ads.map((ad) => <option key={ad.id} value={ad.id}>{ad.businessName} • {ad.scope}</option>)}</select></label>)}</div>
    </section>

    <div className="flex flex-wrap gap-3">
      <button name="status" value="DRAFT" className="rounded-xl bg-ink px-5 py-3 font-black uppercase text-white">Save Draft</button>
      <button name="status" value="PUBLISHED" className="rounded-xl bg-stallRed px-5 py-3 font-black uppercase text-white">Publish Now / Schedule</button>
      <button name="status" value="SCHEDULED" className="rounded-xl bg-stallYellow px-5 py-3 font-black uppercase">Schedule For Later</button>
      {issueId ? <button name="status" value="DRAFT" className="rounded-xl border-4 border-ink bg-white px-5 py-3 font-black uppercase">Cancel Schedule / Unpublish</button> : null}
      {issueId ? <button name="status" value="DRAFT" formAction={action} className="rounded-xl border-4 border-ink bg-white px-5 py-3 font-black uppercase">End Live Early</button> : null}
    </div>
  </form>;
}

function partsInZone(value: Date | string | null | undefined, timeZone: string) { if (!value) return null; const d = new Date(value); const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d); return Object.fromEntries(parts.filter(p=>p.type!=="literal").map(p=>[p.type,p.value])); }
function dateValue(value: Date | string | null | undefined, timeZone: string) { const p = partsInZone(value, timeZone); return p ? `${p.year}-${p.month}-${p.day}` : ""; }
function timeValue(value: Date | string | null | undefined, timeZone: string) { const p = partsInZone(value, timeZone); return p ? `${p.hour}:${p.minute}` : ""; }
