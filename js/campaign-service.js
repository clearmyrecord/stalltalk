import { getAdSlot, normalizePlacement } from "./ad-slots.js";

const CONTENT_AD_SLOT_ID = "content-ad";

export async function fetchPublishedCampaigns({ venueId = "" } = {}) {
  const params = new URLSearchParams();
  if (venueId) params.set("venue_id", venueId);
  const response = await fetch(`/api/published-ads${params.toString() ? `?${params}` : ""}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Published ads request failed (${response.status})`);
  return response.json();
}

export async function fetchCampaignLibrary({ venueId = "" } = {}) {
  const response = await fetch("/api/ad-studio/campaigns", { cache: "no-store" });
  if (!response.ok) throw new Error(`Campaign library request failed (${response.status})`);
  return response.json();
}

export async function saveCampaign(campaign) {
  const slot = getAdSlot(CONTENT_AD_SLOT_ID);
  const placement = normalizePlacement(campaign.placement);
  if (!placement) throw new Error("Campaign placement is required.");

  const now = new Date().toISOString();
  const payload = {
    ...campaign,
    slot_id: CONTENT_AD_SLOT_ID,
    placement,
    width: slot.width,
    height: slot.height,
    status: campaign.status || "draft",
    updated_at: now,
    created_at: campaign.created_at || now
  };

  if (campaign.id) {
    const response = await fetch("/api/ad-studio/campaigns", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, campaignId: campaign.id }) });
    if (!response.ok) throw new Error(`Campaign update failed (${response.status})`);
    return response.json();
  }

  const response = await fetch("/api/ad-studio/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(`Campaign save failed (${response.status})`);
  return response.json();
}

export async function publishCampaign(campaignId, placement) {
  const normalizedPlacement = normalizePlacement(placement);
  if (!normalizedPlacement) throw new Error("Campaign placement is required before publishing.");
  const publishedAt = new Date().toISOString();
  const slot = getAdSlot(CONTENT_AD_SLOT_ID);
  const payload = {
    status: "published",
    slot_id: CONTENT_AD_SLOT_ID,
    placement: normalizedPlacement,
    width: slot.width,
    height: slot.height,
    published_at: publishedAt,
    updated_at: publishedAt
  };
  const response = await fetch("/api/ad-studio/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, action: "publish", campaignId }) });
  if (!response.ok) throw new Error(`Campaign publish failed (${response.status})`);
  return response.json();
}

export async function unpublishCampaign(campaignId) {
  return updateCampaignStatus(campaignId, "draft", { published_at: null });
}

export async function archiveCampaign(campaignId) {
  return updateCampaignStatus(campaignId, "archived");
}

export async function duplicateCampaign(campaign) {
  const { id, created_at, updated_at, published_at, ...copy } = campaign;
  return saveCampaign({ ...copy, name: `${campaign.name || "Campaign"} Copy`, status: "draft", published_at: null });
}

export function reuseCampaign(campaign, overrides = {}) {
  return { ...campaign, slot_id: CONTENT_AD_SLOT_ID, ...overrides, status: "draft", published_at: null };
}

async function updateCampaignStatus(campaignId, status, extra = {}) {
  const payload = { status, updated_at: new Date().toISOString(), ...extra };
  const action = status === "draft" ? "unpublish" : "archive";
  const response = await fetch("/api/ad-studio/campaigns", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, action, campaignId }) });
  if (!response.ok) throw new Error(`Campaign status update failed (${response.status})`);
  return response.json();
}
