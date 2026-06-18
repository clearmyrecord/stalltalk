import { CONTENT_AD_SLOT, getPlacementSlots } from "./ad-slots.js";
import { getPublishedCampaigns } from "./campaign-service.js";

function clear(element) { while (element.firstChild) element.removeChild(element.firstChild); }

export function renderCampaign(campaign) {
  const link = document.createElement("a");
  link.className = "ad-slot-link";
  link.href = campaign.click_url || "#";
  if (/^https?:/i.test(link.href)) { link.target = "_blank"; link.rel = "noopener sponsored"; }
  const img = document.createElement("img");
  img.src = campaign.image_url;
  img.alt = campaign.name || campaign.business_name || "Advertisement";
  img.width = CONTENT_AD_SLOT.width;
  img.height = CONTENT_AD_SLOT.height;
  link.append(img);
  return link;
}

export async function renderPublishedCampaigns() {
  const containers = getPlacementSlots();
  containers.forEach(clear);
  const campaigns = await getPublishedCampaigns();
  containers.forEach((container) => {
    const placement = Number(container.dataset.placement || 0);
    const campaign = campaigns.find((item) => item.slot_id === CONTENT_AD_SLOT.id && Number(item.placement) === placement && item.status === "published" && item.image_url);
    if (campaign) container.append(renderCampaign(campaign));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderPublishedCampaigns().catch((error) => console.error("Unable to render Stall Talk ads", error));
});

window.StallTalkAdRenderer = { renderPublishedCampaigns, renderCampaign };
