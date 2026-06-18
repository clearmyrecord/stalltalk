import { supabaseRequest } from "./supabase-client.js";
import { CONTENT_AD_SLOT } from "./ad-slots.js";

const TABLE = "campaigns";

function normalizeCampaign(input = {}) {
  const now = new Date().toISOString();
  return {
    id: input.id,
    name: input.name || input.headline || "Untitled Campaign",
    business_name: input.business_name || input.businessName || "",
    headline: input.headline || "",
    offer: input.offer || "",
    cta: input.cta || input.ctaText || "",
    slot_id: CONTENT_AD_SLOT.id,
    placement: Number(input.placement || 1),
    width: CONTENT_AD_SLOT.width,
    height: CONTENT_AD_SLOT.height,
    image_url: input.image_url || input.imageUrl || "",
    click_url: input.click_url || input.clickUrl || "#",
    status: input.status || "draft",
    venue_id: input.venue_id || input.venueId || null,
    created_at: input.created_at || now,
    updated_at: now,
    published_at: input.published_at || null
  };
}

export async function createCampaign(input) {
  const [campaign] = await supabaseRequest(TABLE, { method: "POST", body: JSON.stringify(normalizeCampaign(input)) });
  return campaign;
}

export async function updateCampaign(id, updates) {
  const payload = normalizeCampaign({ ...updates, id, created_at: updates.created_at });
  delete payload.created_at;
  const [campaign] = await supabaseRequest(`${TABLE}?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) });
  return campaign;
}

export async function publishCampaign(idOrCampaign, updates = {}) {
  const campaign = typeof idOrCampaign === "string" ? { id: idOrCampaign, ...updates } : idOrCampaign;
  const payload = normalizeCampaign({ ...campaign, ...updates, status: "published", published_at: new Date().toISOString() });
  if (payload.id) return updateCampaign(payload.id, payload);
  return createCampaign(payload);
}

export async function unpublishCampaign(id) {
  return updateCampaign(id, { status: "draft", published_at: null });
}

export async function archiveCampaign(id) {
  return updateCampaign(id, { status: "archived" });
}

export async function duplicateCampaign(id) {
  const [original] = await supabaseRequest(`${TABLE}?id=eq.${encodeURIComponent(id)}&limit=1`);
  if (!original) throw new Error("Campaign not found.");
  const copy = normalizeCampaign({ ...original, id: crypto.randomUUID(), name: `${original.name} Copy`, status: "draft", published_at: null });
  return createCampaign(copy);
}

export function getPublishedCampaigns() {
  return supabaseRequest(`${TABLE}?slot_id=eq.content-ad&status=eq.published&order=placement.asc`);
}

export function getVenueCampaigns(venueId) {
  return supabaseRequest(`${TABLE}?venue_id=eq.${encodeURIComponent(venueId)}&slot_id=eq.content-ad&order=updated_at.desc`);
}

export function getCampaignLibrary() {
  return supabaseRequest(`${TABLE}?slot_id=eq.content-ad&status=neq.archived&order=updated_at.desc`);
}

window.StallTalkCampaignService = { createCampaign, updateCampaign, publishCampaign, unpublishCampaign, archiveCampaign, duplicateCampaign, getPublishedCampaigns, getVenueCampaigns, getCampaignLibrary };
