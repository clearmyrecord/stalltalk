const STORAGE_KEYS = {
  draft: "stalltalk_content_draft",
  published: "stalltalk_content_published",
  ads: "stalltalk_ad_slots",
  settings: "stalltalk_issue_settings",
};

const DEFAULT_SETTINGS = {
  brand: "Potty Favor",
  issueNumber: "001",
  city: "Las Vegas, NV",
  venue: "MGM Grand",
  monthYear: "June 2026",
};

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch (error) {
    console.warn(`Unable to read ${key}`, error);
    return fallback;
  }
}

function normalizeContactHref(contact) {
  if (!contact) return "#sponsor-wall";
  if (/^https?:\/\//i.test(contact) || /^tel:/i.test(contact)) return contact;
  if (/^[+\d][\d\s().-]+$/.test(contact)) return `tel:${contact.replace(/\s/g, "")}`;
  return `https://${contact}`;
}

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((node) => {
    node.textContent = value;
  });
}

function renderIssueSettings(settings = readJson(STORAGE_KEYS.settings, DEFAULT_SETTINGS)) {
  const merged = { ...DEFAULT_SETTINGS, ...settings };
  setText('[data-issue-field="brand"]', merged.brand);
  setText('[data-brand-title]', merged.brand);
  setText('[data-issue-field="city"]', merged.city);
  setText('[data-issue-field="venue"]', merged.venue);
  setText('[data-issue-field="monthYear"]', merged.monthYear);
  setText('[data-issue-field="issueNumber"]', merged.issueNumber);
  document.title = `${merged.brand} by Stall Talk`;
}

function renderPublishedContent(content = readJson(STORAGE_KEYS.published, null)) {
  if (!content) return;

  Object.entries(content).forEach(([key, value]) => {
    const target = document.querySelector(`[data-content="${key}"]`);
    if (!target || typeof value !== "string") return;

    if (key === "trivia") {
      const facts = value.split(/\n+/).map((fact) => fact.trim()).filter(Boolean);
      target.replaceChildren(...facts.map((fact) => {
        const item = document.createElement("li");
        item.textContent = fact;
        return item;
      }));
      return;
    }

    target.textContent = value;
  });
}

function updateAdCard(card, slotNumber, ad) {
  if (window.StallTalkGraphicAds && ad && (ad.headline || ad.businessName)) {
    card.classList.add("pf-ad-card-generated");
    card.replaceChildren(window.StallTalkGraphicAds.build(ad, { slotNumber, compact: true }));
    return;
  }

  const label = card.querySelector(".ad-label");
  const title = card.querySelector("strong");
  const copy = card.querySelector("p");
  const link = card.querySelector("a");

  if (label) label.textContent = `Ad Slot ${slotNumber}`;
  if (title) title.textContent = ad?.businessName || ad?.headline || title.textContent;
  if (copy) copy.textContent = ad?.offer || ad?.subheadline || copy.textContent;
  if (link) {
    link.href = normalizeContactHref(ad?.website || ad?.phone);
    link.textContent = ad?.ctaButtonText || "Claim offer";
  }
}

function updateMiniAd(card, slotNumber, ad) {
  if (window.StallTalkGraphicAds && ad && (ad.headline || ad.businessName)) {
    card.classList.add("pf-mini-generated");
    card.replaceChildren(window.StallTalkGraphicAds.build(ad, { slotNumber, compact: true }));
    return;
  }

  const slot = card.querySelector("span");
  const title = card.querySelector("strong");
  const copy = card.querySelector("small");
  if (slot) slot.textContent = `Ad Slot ${slotNumber}`;
  if (title) title.textContent = ad?.businessName || ad?.headline || title.textContent;
  if (copy) copy.textContent = ad?.offer || ad?.subheadline || copy.textContent;
}

function renderAdSlots(savedSlots = readJson(STORAGE_KEYS.ads, {})) {
  for (let slotNumber = 1; slotNumber <= 8; slotNumber += 1) {
    const ad = savedSlots[String(slotNumber)];
    if (!ad) continue;
    document.querySelectorAll(`[data-ad="${slotNumber}"]`).forEach((card) => updateAdCard(card, slotNumber, ad));
    document.querySelectorAll(`[data-mini-ad="${slotNumber}"], #ad-${slotNumber}`).forEach((card) => updateMiniAd(card, slotNumber, ad));
  }
}

function wireArticleExpansionLabels() {
  document.querySelectorAll(".story-card").forEach((story) => {
    const action = story.querySelector(".summary-action");
    const updateActionText = () => {
      if (action) action.textContent = story.open ? "Tap to collapse" : "Tap to expand";
    };
    updateActionText();
    story.addEventListener("toggle", updateActionText);
  });
}

function wireTapFeedback() {
  document.querySelectorAll(".pf-ad-card a, .ad-dot, .graphic-ad").forEach((link) => {
    link.addEventListener("click", () => {
      link.classList.add("was-tapped");
      window.setTimeout(() => link.classList.remove("was-tapped"), 500);
    });
  });
}

function refreshIssue() {
  renderIssueSettings();
  renderPublishedContent();
  renderAdSlots();
  wireTapFeedback();
}

wireArticleExpansionLabels();
refreshIssue();

window.addEventListener("storage", (event) => {
  if ([STORAGE_KEYS.published, STORAGE_KEYS.ads, STORAGE_KEYS.settings].includes(event.key)) {
    refreshIssue();
  }
});
