import { getAdSlot } from './ad-slots.js';

export function renderPublishedAd(container, campaign) {
  if (!container || !campaign?.image_url) return;
  const slot = getAdSlot(campaign.slot_id);
  container.classList.add("has-published-ad", "issue-ad-placement");
  container.dataset.adSlot = campaign.slot_id || slot.id;
  container.style.removeProperty("--ad-aspect-ratio");
  container.innerHTML = "";

  const link = document.createElement("a");
  link.className = "published-ad-link";
  link.href = campaign.target_url || "https://pottyfavor.com/advertise";
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  const image = document.createElement("img");
  image.className = "generated-ad-image";
  image.src = campaign.image_url;
  image.alt = `${campaign.business_name || "Sponsor"} advertisement`;

  link.appendChild(image);
  container.appendChild(link);
}

export function renderAdPlaceholder(container) {
  if (!container) return;
  container.classList.add("issue-ad-placement", "is-empty");
  container.style.removeProperty("--ad-aspect-ratio");
  container.innerHTML = `
    <a class="ad-placeholder-link" href="https://pottyfavor.com/advertise">
      <strong>Advertise Here</strong>
      <span>Full-width editorial magazine ad placement inside Potty Favor.</span>
      <em>Claim This Spot</em>
    </a>
  `;
}
