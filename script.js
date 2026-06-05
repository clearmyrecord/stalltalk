const stories = document.querySelectorAll(".story-card");
const STALLTALK_PUBLIC_AD_STORAGE_KEY = window.StallTalkGraphicAds?.storageKey || "stalltalk_ad_slots_v1";
const STALLTALK_CONTENT_PUBLISHED_STORAGE_KEY = "stalltalk_content_published";

stories.forEach((story) => {
  const action = story.querySelector(".summary-action");

  const updateActionText = () => {
    if (!action) return;
    action.textContent = story.open ? "Tap to collapse" : "Tap to expand";
  };

  updateActionText();
  story.addEventListener("toggle", updateActionText);
});

function addTapFeedback() {
  document.querySelectorAll(".ad-card a, .ad-dot, .graphic-ad").forEach((link) => {
    if (link.dataset.tapFeedbackBound === "true") return;
    link.dataset.tapFeedbackBound = "true";
    link.addEventListener("click", () => {
      link.classList.add("was-tapped");
      window.setTimeout(() => link.classList.remove("was-tapped"), 500);
    });
  });
}

function readSavedAdSlots() {
  try {
    return JSON.parse(localStorage.getItem(STALLTALK_PUBLIC_AD_STORAGE_KEY)) || {};
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

function adContact(ad) {
  return ad.website || ad.phone || ad.contact || ad.contactUrl || "#sponsor-wall";
}

function updateRailAd(card, slotNumber, ad) {
  if (!ad) return;

  if (window.StallTalkGraphicAds && (ad.headline || window.StallTalkGraphicAds.imageSource(ad))) {
    card.replaceChildren(window.StallTalkGraphicAds.build(ad, { slotNumber, compact: true }));
    return;
  }

  const label = card.querySelector(".ad-label");
  const title = card.querySelector("strong");
  const copy = card.querySelector("p");
  const link = card.querySelector("a");

  if (label) label.textContent = `Ad #${slotNumber} • ${ad.adSize || ad.adSlotSize || "Custom"}`;
  if (title) title.textContent = ad.businessName || ad.headline || "Saved sponsor";
  if (copy) copy.textContent = ad.offer || ad.offerText || ad.subheadline || "Saved local offer.";
  if (link) {
    link.href = normalizeContactHref(adContact(ad));
    link.textContent = ad.ctaButtonText || "Claim offer";
    link.setAttribute("aria-label", `View ${ad.businessName || "sponsor"} offer`);
  }
}

function updateMiniAd(card, slotNumber, ad) {
  if (!ad) return;

  if (window.StallTalkGraphicAds && (ad.headline || window.StallTalkGraphicAds.imageSource(ad))) {
    card.replaceChildren(window.StallTalkGraphicAds.build(ad, { slotNumber, compact: true }));
    card.dataset.coupon = ad.couponCode || "";
    card.title = `${ad.headline || ad.businessName || "Saved graphic ad"} ${ad.couponCode || ""}`.trim();
    return;
  }

  const title = card.querySelector("strong");
  const copy = card.querySelector("small");

  card.dataset.coupon = ad.couponCode || "";
  card.title = `${ad.headline || "Saved ad"} ${ad.disclaimer || ""}`.trim();
  if (title) title.textContent = ad.businessName || ad.headline || `Saved slot ${slotNumber}`;
  if (copy) copy.textContent = ad.offer || ad.offerText || ad.subheadline || `Saved slot ${slotNumber}`;
}

function loadSavedAdSlots() {
  const savedSlots = readSavedAdSlots();

  for (let slotNumber = 1; slotNumber <= 8; slotNumber += 1) {
    const ad = savedSlots[String(slotNumber)] || savedSlots[slotNumber];
    if (!ad) continue;

    document.querySelectorAll(`[data-ad="${slotNumber}"]`).forEach((card) => updateRailAd(card, slotNumber, ad));

    const miniAd = document.querySelector(`#ad-${slotNumber}`);
    if (miniAd) updateMiniAd(miniAd, slotNumber, ad);
  }

  addTapFeedback();
}

function readPublishedIssueContent() {
  try {
    return JSON.parse(localStorage.getItem(STALLTALK_CONTENT_PUBLISHED_STORAGE_KEY)) || null;
  } catch (error) {
    console.warn("Unable to load Stall Talk published content", error);
    return null;
  }
}

function updatePublishedIssueContent(content = readPublishedIssueContent()) {
  if (!content) return;

  Object.entries(content).forEach(([key, value]) => {
    const target = document.querySelector(`[data-content="${key}"]`);
    if (!target || typeof value !== "string") return;

    if (key === "trivia") {
      const facts = value.split(/\n+/).map((fact) => fact.trim()).filter(Boolean);
      target.replaceChildren(
        ...facts.map((fact) => {
          const item = document.createElement("li");
          item.textContent = fact;
          return item;
        }),
      );
      return;
    }

    target.textContent = value;
  });
}

function updateHomepageFromLocalStorage() {
  loadSavedAdSlots();
  updatePublishedIssueContent();
}

window.addEventListener("DOMContentLoaded", updateHomepageFromLocalStorage);
window.addEventListener("load", updateHomepageFromLocalStorage);
window.addEventListener("storage", (event) => {
  if (event.key === STALLTALK_PUBLIC_AD_STORAGE_KEY) {
    loadSavedAdSlots();
    return;
  }

  if (event.key !== STALLTALK_CONTENT_PUBLISHED_STORAGE_KEY) return;

  try {
    updatePublishedIssueContent(JSON.parse(event.newValue) || null);
  } catch (error) {
    console.warn("Unable to refresh Stall Talk published content", error);
  }
});
