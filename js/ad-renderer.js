import { AD_SLOTS, getSlotAspectRatio, normalizePlacement } from "./ad-slots.js";
import { fetchPublishedCampaigns } from "./campaign-service.js";
import { isSupabaseConfigured } from "./supabase-client.js";

export function renderCampaign(container, campaign) {
  if (!container || !campaign?.image_url) return;

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
  image.width = campaign.width || 320;
  image.height = campaign.height || 100;

  link.append(image);
  container.append(link);
}

export async function renderPublishedAds({ venueId = new URLSearchParams(window.location.search).get("venue_id") || "" } = {}) {
  const containers = reserveAdSlots();
  if (!isSupabaseConfigured()) return [];

  const campaigns = await fetchPublishedCampaigns({ venueId });
  containers.forEach((container) => {
    const slotId = container.dataset.adSlot;
    const placement = normalizePlacement(container.dataset.placement);
    const campaign = campaigns.find((candidate) => candidate.slot_id === slotId && normalizePlacement(candidate.placement) === placement);
    if (campaign) renderCampaign(container, campaign);
  });
  return campaigns;
}

function reserveAdSlots() {
  const containers = [];
  AD_SLOTS.forEach((slot) => {
    document.querySelectorAll(slot.selector).forEach((container) => {
      container.style.setProperty("--ad-aspect-ratio", `${slot.width} / ${slot.height}`);
      container.setAttribute("aria-label", container.getAttribute("aria-label") || slot.label);
      containers.push(container);
    });
  });
  return containers;
}

document.addEventListener("DOMContentLoaded", () => {
  renderPublishedAds().catch((error) => console.warn("Published ads could not be loaded", error));
});
