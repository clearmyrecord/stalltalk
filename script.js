const stories = document.querySelectorAll(".story-card");
const STALLTALK_AD_STORAGE_KEY = "stalltalk_ad_slots_v1";

stories.forEach((story) => {
  const action = story.querySelector(".summary-action");

  const updateActionText = () => {
    if (!action) return;
    action.textContent = story.open ? "Tap to collapse" : "Tap to expand";
  };

  updateActionText();
  story.addEventListener("toggle", updateActionText);
});

const adLinks = document.querySelectorAll(".ad-card a, .ad-dot");

adLinks.forEach((link) => {
  link.addEventListener("click", () => {
    link.classList.add("was-tapped");
    window.setTimeout(() => link.classList.remove("was-tapped"), 500);
  });
});

function readSavedAdSlots() {
  try {
    return JSON.parse(localStorage.getItem(STALLTALK_AD_STORAGE_KEY)) || {};
  } catch (error) {
    console.warn("Unable to load Stall Talk ad slots", error);
    return {};
  }
}

function normalizeContactHref(contact) {
  if (!contact) return "#sponsor-wall";
  if (/^https?:\/\//i.test(contact) || /^tel:/i.test(contact)) return contact;
  if (/^[+\d][\d\s().-]+$/.test(contact)) return `tel:${contact.replace(/\s/g, "")}`;
  return `https://${contact}`;
}

function updateRailAd(card, slotNumber, ad) {
  const label = card.querySelector(".ad-label");
  const title = card.querySelector("strong");
  const copy = card.querySelector("p");
  const link = card.querySelector("a");

  if (label) label.textContent = `Ad #${slotNumber} • ${ad.adSlotSize || "Custom"}`;
  if (title) title.textContent = ad.businessName || ad.headline;
  if (copy) copy.textContent = ad.offerText || ad.subheadline;
  if (link) {
    link.textContent = ad.ctaButtonText || "Claim offer";
    link.href = normalizeContactHref(ad.contact);
    link.setAttribute("aria-label", `${ad.ctaButtonText || "Claim offer"} for ${ad.businessName || ad.headline}`);
  }
}

function updateMiniAd(card, slotNumber, ad) {
  const title = card.querySelector("strong");
  const copy = card.querySelector("small");

  card.dataset.coupon = ad.couponCode || "";
  card.title = `${ad.headline || "Saved ad"} ${ad.disclaimer || ""}`.trim();
  if (title) title.textContent = ad.businessName || ad.headline;
  if (copy) copy.textContent = ad.offerText || ad.subheadline || `Saved slot ${slotNumber}`;
}

function loadSavedAdSlots() {
  const savedSlots = readSavedAdSlots();

  Object.entries(savedSlots).forEach(([slotNumber, ad]) => {
    document.querySelectorAll(`[data-ad="${slotNumber}"]`).forEach((card) => updateRailAd(card, slotNumber, ad));

    const miniAd = document.querySelector(`#ad-${slotNumber}`);
    if (miniAd) updateMiniAd(miniAd, slotNumber, ad);
  });
}

loadSavedAdSlots();
