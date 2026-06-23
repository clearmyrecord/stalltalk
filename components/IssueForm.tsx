"use client";

import { useActionState, useEffect } from "react";
import type { Ad, Article, Issue, IssueAdSlot, IssueContentBlock, Publisher, QrCode, Restroom, Venue } from "@prisma/client";
import { createIssueAction, updateIssueAction, type IssueSaveState } from "@/lib/actions";
import { contentLabels } from "@/lib/format";
import { SPONSOR_PLACEMENTS } from "@/lib/sponsor-placements";

type IssueWithBlocks = Issue & { contentBlocks: IssueContentBlock[]; adSlots: IssueAdSlot[] };

const initialState: IssueSaveState = { ok: false, message: "" };
const CONTENT_ZONES = [
  ["mission", "MISSION"],
  ["funny", "HILARIOUSLY_FUNNY"],
  ["feature", "FEATURE_ARTICLE"],
  ["restaurant", "RESTAURANT_REVIEW"],
  ["events", "EVENT_CALENDAR"],
  ["deals", "LOCAL_DEALS"],
  ["trivia", "TRIVIA"],
  ["quote", "INSPIRATIONAL_QUOTES"],
  ["community", "WORD_OF_THE_MONTH"],
] as const;
const zoneOptions = CONTENT_ZONES.map(([, type]) => ({ value: type, label: contentLabels[type as keyof typeof contentLabels] }));

export function IssueForm({ publishers, venues, restrooms, qrCodes, articles, ads, issue }: { publishers: Publisher[]; venues: Venue[]; restrooms: Restroom[]; qrCodes: QrCode[]; articles: Article[]; ads: Ad[]; issue?: IssueWithBlocks }) {
  const action = issue ? updateIssueAction.bind(null, issue.id) : createIssueAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const blocks = CONTENT_ZONES.map(([key], index) => issue?.contentBlocks.find((block) => (block.layout as any)?.key === key) || issue?.contentBlocks.find((block) => block.sortOrder === index + 1));

  useEffect(() => {
    if (!state.message) return;
    console.log("[issue-save-client-response]", state);
  }, [state]);

  return <form action={formAction} className="mt-6 grid gap-5" onSubmit={(event) => {
    const formData = new FormData(event.currentTarget);
    const selectedTypes = CONTENT_ZONES.map((_, index) => String(formData.get(`blockType${index + 1}`) || "")).filter(Boolean);
    if (new Set(selectedTypes).size !== selectedTypes.length) {
      event.preventDefault();
      alert("Content type already assigned.");
      return;
    }
    if (process.env.NODE_ENV !== "production") console.log("[issue-save-client-payload]", Object.fromEntries(formData.entries()));
  }}>
    {issue ? <input type="hidden" name="updatedAt" value={issue.updatedAt.toISOString()} /> : null}
    {state.message ? <div className={`rounded-2xl border-4 border-ink p-4 font-black shadow-brutal ${state.ok ? "bg-green-100" : "bg-red-100"}`} role="status">
      <p>{state.message}</p>
      {state.ok && state.editUrl ? <a className="underline" href={state.editUrl}>Open saved issue</a> : null}
    </div> : null}
    <div className="grid gap-4 rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal md:grid-cols-4">
      <Select name="publisherId" label="Publisher" value={issue?.publisherId || publishers[0]?.id} options={publishers.map((p) => [p.id, p.name])} />
      <Select name="venueId" label="Issue Scope / Venue" value={issue?.venueId} options={[["", "Global Issue — all venues"], ...venues.map((v) => [v.id, `${v.name} — ${v.city}`] as [string, string])]} />
      <Select name="restroomId" label="Location / Restroom" value={issue?.restroomId || ""} options={[["", "Venue-wide issue"], ...restrooms.map((r) => [r.id, r.name] as [string, string])]} />
      <Select name="qrCodeId" label="Dynamic QR destination" value={issue?.qrCodeId || ""} options={[["", "No QR"], ...qrCodes.map((q) => [q.id, `${q.qrName} (${q.qrSlug})`] as [string, string])]} />
      <Field name="title" label="Issue Title" value={issue?.title || "Potty Favor"} />
      <Field name="slug" label="Issue slug (auto: venue/location + month + year)" value={(issue as any)?.slug || ""} />
      <Field name="publicUrl" label="Public URL preview" value={(issue as any)?.publicUrl || "Auto-generated after save"} />
      <Field name="month" label="Month" value={issue?.month || "June"} />
      <Field name="year" label="Year" value={String(issue?.year || new Date().getFullYear())} />
      <Field name="issueNumber" label="Issue #" value={String(issue?.issueNumber || 1)} />
      <label className="grid gap-1 font-black uppercase">Status<select name="status" defaultValue={issue?.status || "DRAFT"} className="rounded border-2 border-ink p-3"><option>DRAFT</option><option>SCHEDULED</option><option>PUBLISHED</option><option>ARCHIVED</option></select></label>
    </div>

    <div className="grid gap-4 rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal md:grid-cols-3">
      <div className="md:col-span-3">
        <h2 className="font-display text-5xl uppercase">Publishing Schedule</h2>
        <p className="font-bold">Schedule next month’s issue without exposing raw Schedule ISO.</p>
      </div>
      <Field name="publishDate" label="Publish Date" type="date" value={dateValue((issue as any)?.scheduledPublishAt || issue?.scheduledAt)} />
      <Field name="publishTime" label="Publish Time" type="time" value={timeValue((issue as any)?.scheduledPublishAt || issue?.scheduledAt)} />
      <Field name="timezone" label="Timezone" value={(issue as any)?.timezone || "America/Los_Angeles"} />
      <Check name="autoPublish" label="Auto Publish" checked={(issue as any)?.isScheduled || issue?.status === "SCHEDULED"} />
      <Check name="replaceDefaultOnPublish" label="Replace Default Global Issue" checked={(issue as any)?.replaceDefaultOnPublish ?? true} />
      <Check name="archivePreviousOnPublish" label="Archive Previous Issue" checked={(issue as any)?.archivePreviousOnPublish ?? true} />
    </div>

    <div className="rounded-2xl border-4 border-ink bg-stallYellow p-5 shadow-brutal">
      <h2 className="font-display text-5xl uppercase">Venue-aware layout editor</h2>
      <p className="mb-4 font-bold">Leave venue assignment empty for global network content, or choose one/multiple venues for venue-only articles, events, reviews, announcements, and coupons.</p>
      <div className="grid gap-4 md:grid-cols-2">{blocks.map((block, i) => { const [layoutKey, defaultType] = CONTENT_ZONES[i]; return <div key={layoutKey} className="grid gap-3 rounded-xl border-2 border-ink bg-white p-3">
        <p className="font-display text-3xl uppercase">Drop Zone {i + 1}</p>
        <input type="hidden" name={`blockLayoutKey${i + 1}`} value={layoutKey} />
        <select name={`blockType${i + 1}`} defaultValue={block?.type || defaultType} className="rounded border-2 border-ink p-2 font-black">{zoneOptions.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select>
        <select name={`blockArticle${i + 1}`} defaultValue={block?.articleId || ""} className="rounded border-2 border-ink p-2"><option value="">No linked article</option>{articles.map((article) => <option key={article.id} value={article.id}>{article.title}</option>)}</select>
        <VenueMultiSelect name={`blockVenueIds${i + 1}`} venues={venues} selected={block?.venueIds || []} />
        <input name={`blockTitle${i + 1}`} defaultValue={block?.title} placeholder="Title" className="rounded border-2 border-ink p-2" />
        <textarea name={`blockBody${i + 1}`} defaultValue={block?.body} placeholder="Body" rows={4} className="rounded border-2 border-ink p-2" />
        <input name={`blockImage${i + 1}`} defaultValue={block?.imageUrl || ""} placeholder="Image URL optional" className="rounded border-2 border-ink p-2" />
      </div>})}</div>
    </div>

    <div className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal">
      <h2 className="font-display text-5xl uppercase">Assign 8 Premium Sponsor Panels</h2>
      <p className="mb-3 font-bold">Ads can be global, city, venue, or restroom scoped. Venue ads may target one or multiple venues from the ad editor.</p>
      <div className="grid gap-3 md:grid-cols-4">{SPONSOR_PLACEMENTS.map((placement) => <label key={placement.number} className="grid gap-1 font-black uppercase">{placement.label}<select name={`slot${placement.number}`} defaultValue={issue?.adSlots.find((slot) => slot.slotNumber === placement.number)?.adId || ""} className="rounded border-2 border-ink p-3"><option value="">Auto serve</option>{ads.map((ad) => <option key={ad.id} value={ad.id}>{ad.businessName} • {ad.scope}</option>)}</select></label>)}</div>
    </div>
    <button disabled={pending} className="rounded-2xl border-4 border-ink bg-stallRed px-6 py-4 font-black uppercase text-white shadow-brutal disabled:opacity-60">{pending ? "Saving…" : "Save Issue"}</button>
  </form>;
}

function VenueMultiSelect({ name, venues, selected }: { name: string; venues: Venue[]; selected: string[] }) {
  return <label className="grid gap-1 font-black uppercase">Venue targeting<span className="text-xs normal-case">No selection = global</span><select name={name} multiple defaultValue={selected} className="min-h-28 rounded border-2 border-ink p-2 normal-case">{venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}</select></label>;
}
function dateValue(value?: Date | string | null) { if (!value) return ""; return new Date(value).toISOString().slice(0, 10); }
function timeValue(value?: Date | string | null) { if (!value) return ""; return new Date(value).toISOString().slice(11, 16); }
function Check({ name, label, checked }: { name: string; label: string; checked: boolean }) { return <label className="flex items-center gap-3 rounded-xl border-2 border-ink p-3 font-black uppercase"><input type="checkbox" name={name} defaultChecked={checked} className="h-5 w-5" />{label}<input type="hidden" name={name} value="off" /></label>; }
function Field({ name, label, value, type = "text" }: { name: string; label: string; value: string; type?: string }) { return <label className="grid gap-1 font-black uppercase">{label}<input type={type} name={name} defaultValue={value || ""} className="rounded border-2 border-ink p-3 font-bold normal-case" /></label>; }
function Select({ name, label, value, options }: { name: string; label: string; value?: string | null; options: Array<[string, string]> }) { return <label className="grid gap-1 font-black uppercase">{label}<select name={name} defaultValue={value || ""} className="rounded border-2 border-ink p-3">{options.map(([id, label]) => <option key={id || label} value={id}>{label}</option>)}</select></label>; }
