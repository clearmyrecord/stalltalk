import { AD_SLOTS, getSlotAspectRatio, normalizePlacement } from "./ad-slots.js";
import { fetchPublishedCampaigns } from "./campaign-service.js";

export function renderCampaign(container, campaign) {
  if (!container || !campaign?.image_url) return;

  container.innerHTML = "";
  container.style.setProperty("--ad-aspect-ratio", getSlotAspectRatio(campaign.slot_id));
  container.classList.add("has-published-ad");

  const sponsored = document.createElement("span");
  sponsored.className = "sponsored-label";
  sponsored.textContent = "Sponsored";

  const link = document.createElement("a");
  link.className = "published-ad-link";
  link.href = campaign.click_url || "https://pottyfavor.com/advertise";
  link.target = campaign.click_url ? "_blank" : "_self";
  link.rel = campaign.click_url ? "noopener sponsored" : "";

  const image = document.createElement("img");
  image.src = campaign.image_url;
  image.alt = campaign.name || campaign.business_name || "Published advertisement";
  image.loading = "eager";
  image.width = campaign.width || 900;
  image.height = campaign.height || 300;

  const cta = document.createElement("span");
  cta.className = "ad-cta-button";
  cta.textContent = campaign.cta_text || campaign.cta || "Learn More";

  link.append(image, cta);
  container.append(sponsored, link);
}

export async function renderPublishedAds({ venueId } = {}) {
  if (typeof document === "undefined") return [];
  const resolvedVenueId = venueId ?? (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("venue_id") || "" : "");
  const containers = reserveAdSlots();
  const campaigns = await fetchPublishedCampaigns({ venueId: resolvedVenueId });
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

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    renderPublishedAds().catch((error) => console.warn("Published ads could not be loaded", error));
  });
}
