import { supabaseFetch } from "./supabase-client.js";
import { getAdSlot } from "./ad-slots.js";

const CAMPAIGN_COLUMNS = "id,name,business_name,headline,offer,cta,slot_id,width,height,image_url,click_url,status,venue_id,created_at,updated_at,published_at";

export async function fetchPublishedCampaigns({ venueId = "" } = {}) {
  const filters = ["status=eq.published", "select=" + CAMPAIGN_COLUMNS, "order=published_at.desc"];
  if (venueId) filters.push(`venue_id=eq.${encodeURIComponent(venueId)}`);
  return supabaseFetch(`campaigns?${filters.join("&")}`);
}

export async function fetchCampaignLibrary({ venueId = "" } = {}) {
  const filters = ["select=" + CAMPAIGN_COLUMNS, "order=updated_at.desc"];
  if (venueId) filters.push(`venue_id=eq.${encodeURIComponent(venueId)}`);
  return supabaseFetch(`campaigns?${filters.join("&")}`);
}

export async function saveCampaign(campaign) {
  const slot = getAdSlot(campaign.slot_id);
  const now = new Date().toISOString();
  const payload = {
    ...campaign,
    width: campaign.width || slot?.width,
    height: campaign.height || slot?.height,
    status: campaign.status || "draft",
    updated_at: now,
    created_at: campaign.created_at || now
  };

  if (campaign.id) {
    return supabaseFetch(`campaigns?id=eq.${encodeURIComponent(campaign.id)}`, { method: "PATCH", body: JSON.stringify(payload) });
  }

  return supabaseFetch("campaigns", { method: "POST", body: JSON.stringify(payload) });
}

export async function publishCampaign(campaignId, slotId) {
  const publishedAt = new Date().toISOString();
  const payload = { status: "published", slot_id: slotId, published_at: publishedAt, updated_at: publishedAt };
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
  return { ...campaign, ...overrides, status: "draft", published_at: null };
}

async function updateCampaignStatus(campaignId, status, extra = {}) {
  const payload = { status, updated_at: new Date().toISOString(), ...extra };
  return supabaseFetch(`campaigns?id=eq.${encodeURIComponent(campaignId)}`, { method: "PATCH", body: JSON.stringify(payload) });
}
