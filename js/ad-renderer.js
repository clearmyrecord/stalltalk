import { AD_SLOTS, getSlotAspectRatio } from "./ad-slots.js";
import { fetchPublishedCampaigns } from "./campaign-service.js";
import { isSupabaseConfigured } from "./supabase-client.js";

export function renderCampaign(campaign) {
  const container = document.querySelector(`[data-ad-slot="${campaign.slot_id}"]`);
  if (!container || !campaign.image_url) return;

  container.innerHTML = "";
  container.style.setProperty("--ad-aspect-ratio", getSlotAspectRatio(campaign.slot_id));
  container.classList.add("has-published-ad");

  const link = document.createElement("a");
  link.className = "published-ad-link";
  link.href = campaign.click_url || "#";
  link.target = campaign.click_url ? "_blank" : "_self";
  link.rel = campaign.click_url ? "noopener sponsored" : "";

  const image = document.createElement("img");
  image.src = campaign.image_url;
  image.alt = campaign.name || campaign.business_name || "Published advertisement";
  image.loading = "eager";
  image.width = campaign.width || undefined;
  image.height = campaign.height || undefined;

  link.append(image);
  container.append(link);
}

export async function renderPublishedAds({ venueId = new URLSearchParams(window.location.search).get("venue_id") || "" } = {}) {
  reserveAdSlots();
  if (!isSupabaseConfigured()) return [];
  const campaigns = await fetchPublishedCampaigns({ venueId });
  const latestBySlot = new Map();
  campaigns.forEach((campaign) => {
    if (!latestBySlot.has(campaign.slot_id)) latestBySlot.set(campaign.slot_id, campaign);
  });
  latestBySlot.forEach(renderCampaign);
  return campaigns;
}

function reserveAdSlots() {
  AD_SLOTS.forEach((slot) => {
    document.querySelectorAll(slot.selector).forEach((container) => {
      container.style.setProperty("--ad-aspect-ratio", `${slot.width} / ${slot.height}`);
      container.setAttribute("aria-label", container.getAttribute("aria-label") || slot.label);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderPublishedAds().catch((error) => console.warn("Published ads could not be loaded", error));
});
