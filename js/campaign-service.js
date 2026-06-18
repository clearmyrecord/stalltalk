import { supabaseFetch } from "./supabase-client.js";
import { getAdSlot, normalizePlacement } from "./ad-slots.js";

const CAMPAIGN_COLUMNS = "id,name,business_name,headline,offer,cta,slot_id,placement,width,height,image_url,click_url,status,venue_id,created_at,updated_at,published_at";
const CONTENT_AD_SLOT_ID = "content-ad";

export async function fetchPublishedCampaigns({ venueId = "" } = {}) {
  const filters = ["status=eq.published", `slot_id=eq.${CONTENT_AD_SLOT_ID}`, "select=" + CAMPAIGN_COLUMNS, "order=published_at.desc"];
  if (venueId) filters.push(`venue_id=eq.${encodeURIComponent(venueId)}`);
  return supabaseFetch(`campaigns?${filters.join("&")}`);
}

export async function fetchCampaignLibrary({ venueId = "" } = {}) {
  const filters = ["select=" + CAMPAIGN_COLUMNS, "order=updated_at.desc"];
  if (venueId) filters.push(`venue_id=eq.${encodeURIComponent(venueId)}`);
  return supabaseFetch(`campaigns?${filters.join("&")}`);
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
    return supabaseFetch(`campaigns?id=eq.${encodeURIComponent(campaign.id)}`, { method: "PATCH", body: JSON.stringify(payload) });
  }

  return supabaseFetch("campaigns", { method: "POST", body: JSON.stringify(payload) });
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
  return supabaseFetch(`campaigns?id=eq.${encodeURIComponent(campaignId)}`, { method: "PATCH", body: JSON.stringify(payload) });
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
  return supabaseFetch(`campaigns?id=eq.${encodeURIComponent(campaignId)}`, { method: "PATCH", body: JSON.stringify(payload) });
}
