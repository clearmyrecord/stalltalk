"use client";

import { useState } from "react";
import { DEFAULT_PUBLIC_ISSUE_ID, DEFAULT_PUBLIC_ISSUE_LABEL } from "@/lib/default-public-issue";

type Campaign = { campaignId: string; parentCampaignId: string | null; versionNumber: number; businessName: string; headline: string; subheadline: string; ctaText: string; couponCode: string; imageUrl: string; promptUsed: string; targetUrl: string; selectedSlot: number | null; slotPublished: number | null; publishStatus: string; createdAt: string; publishedAt: string | null; issueId: string | null; issueTitle: string | null; venueName: string | null; publisherId: string; advertiserId: string; targetType?: string | null; targetLabel?: string | null };
type Issue = { id: string; title: string; label?: string; venueName: string; isDefault?: boolean; targetType?: string };
const headers = ["Business Name", "Headline", "Status", "Issue", "Venue", "Slot", "Created Date", "Published Date", "Version", "Actions"];
function fileSafe(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "business"; }
async function downloadPng(campaign: Campaign) {
  if (!campaign.imageUrl) return;
  const response = await fetch(campaign.imageUrl);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `pottyfavor-content-ad-placement-${campaign.slotPublished || campaign.selectedSlot || 1}-${fileSafe(campaign.businessName)}.png`;
  document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}

export function CampaignLibrary({ campaigns, issues }: { campaigns: Campaign[]; issues: Issue[] }) {
  const [items, setItems] = useState(campaigns);
  async function deleteCampaign(campaign: Campaign) {
    if (campaign.publishStatus === "PUBLISHED" && !window.confirm("This campaign is published. Delete and unpublish it from the homepage?")) return;
    const response = await fetch(`/api/ad-studio/campaigns/${encodeURIComponent(campaign.campaignId)}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.error) alert(result.error || "Delete failed");
    else setItems((current) => current.filter((item) => item.campaignId !== campaign.campaignId));
  }

  async function action(campaign: Campaign, actionName: "duplicate" | "unpublish" | "archive" | "publish") {
    const issueOptions = issues.map((issue) => issue.isDefault ? `${issue.label || issue.title} (${issue.id})` : `${issue.title} • ${issue.venueName} (${issue.id})`).join("\n");
    const issueId = actionName === "publish" ? window.prompt(`Issue ID to publish into (use ${DEFAULT_PUBLIC_ISSUE_ID} for ${DEFAULT_PUBLIC_ISSUE_LABEL})\n${issueOptions}`, campaign.issueId || DEFAULT_PUBLIC_ISSUE_ID) : "";
    const slotNumber = actionName === "publish" ? window.prompt("Slot / placement number", String(campaign.selectedSlot || campaign.slotPublished || 1)) : "";
    const response = await fetch("/api/ad-studio/campaigns", { method: actionName === "duplicate" ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...campaign, action: actionName, issueId, targetType: issueId === DEFAULT_PUBLIC_ISSUE_ID ? DEFAULT_PUBLIC_ISSUE_ID : "issue", targetLabel: issueId === DEFAULT_PUBLIC_ISSUE_ID ? DEFAULT_PUBLIC_ISSUE_LABEL : issues.find((issue) => issue.id === issueId)?.title || issueId, slotNumber, businessName: campaign.businessName, title: campaign.headline, offer: campaign.subheadline, artworkUrl: campaign.imageUrl, generatedHeadline: campaign.headline, generatedSubheadline: campaign.subheadline }) });
    const result = await response.json();
    if (!response.ok || result.error) alert(result.error || "Campaign action failed"); else window.location.reload();
  }

  return (
    <section className="grid gap-5">
      <div><p className="font-black uppercase tracking-[.25em] text-stallRed">AI Ad Studio</p><h1 className="font-display text-7xl uppercase">Campaign Library</h1><p className="font-bold">Draft, preview, version, publish, unpublish, archive, and download 3:1 sponsor banner content-ad campaigns. Publish targets include Default Public Issue plus saved issue records.</p></div>
      <div className="overflow-x-auto rounded-2xl border-4 border-ink bg-stallYellow p-4 shadow-brutal">
        <table className="w-full min-w-[980px] border-separate border-spacing-y-2 text-left">
          <thead className="text-xs font-black uppercase"><tr>{headers.map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
          <tbody>{items.map((campaign) => (
            <tr key={campaign.campaignId} className="bg-white font-bold">
              <td className="rounded-l-xl border-y-2 border-l-2 border-ink p-2">{campaign.businessName}</td><td className="border-y-2 border-ink p-2">{campaign.headline}</td><td className="border-y-2 border-ink p-2 font-black uppercase text-stallRed">{campaign.publishStatus}</td><td className="border-y-2 border-ink p-2">{campaign.issueId === DEFAULT_PUBLIC_ISSUE_ID ? DEFAULT_PUBLIC_ISSUE_LABEL : campaign.issueTitle || "—"}</td><td className="border-y-2 border-ink p-2">{campaign.venueName || "—"}</td><td className="border-y-2 border-ink p-2">{campaign.slotPublished || campaign.selectedSlot || "—"}</td><td className="border-y-2 border-ink p-2">{new Date(campaign.createdAt).toLocaleDateString()}</td><td className="border-y-2 border-ink p-2">{campaign.publishedAt ? new Date(campaign.publishedAt).toLocaleDateString() : "—"}</td><td className="border-y-2 border-ink p-2">v{campaign.versionNumber}</td>
              <td className="rounded-r-xl border-y-2 border-r-2 border-ink p-2"><div className="flex flex-wrap gap-1"><button className="rounded bg-stallYellow px-2 py-1 text-xs font-black uppercase" onClick={() => alert(`${campaign.businessName}\n${campaign.headline}\n${campaign.subheadline}\nCTA: ${campaign.ctaText}\nCode: ${campaign.couponCode}\nURL: ${campaign.targetUrl}\nIssue/Slot: ${campaign.issueId === DEFAULT_PUBLIC_ISSUE_ID ? DEFAULT_PUBLIC_ISSUE_LABEL : campaign.issueTitle || "Draft"} / ${campaign.slotPublished || campaign.selectedSlot || "—"}`)}>Preview</button><a className="rounded bg-blue-500 px-2 py-1 text-xs font-black uppercase text-white" href="/admin/ad-studio">Edit</a><button className="rounded bg-white px-2 py-1 text-xs font-black uppercase" onClick={() => action(campaign, "duplicate")}>Duplicate</button><button className="rounded bg-green-700 px-2 py-1 text-xs font-black uppercase text-white" onClick={() => action(campaign, "publish")}>Publish</button><button className="rounded bg-stallRed px-2 py-1 text-xs font-black uppercase text-white" onClick={() => action(campaign, "unpublish")}>Unpublish</button><button className="rounded bg-ink px-2 py-1 text-xs font-black uppercase text-white" onClick={() => action(campaign, "archive")}>Archive</button><button className="rounded bg-stallPurple px-2 py-1 text-xs font-black uppercase text-white" onClick={() => downloadPng(campaign)}>Download PNG</button><button className="rounded bg-red-700 px-2 py-1 text-xs font-black uppercase text-white" onClick={() => deleteCampaign(campaign)}>Delete</button></div></td>
            </tr>
          ))}</tbody>
        </table>
        {items.length === 0 ? <p className="rounded-xl border-2 border-ink bg-white p-4 font-black uppercase">No campaigns yet. Generate one in Ad Studio.</p> : null}
      </div>
    </section>
  );
}
