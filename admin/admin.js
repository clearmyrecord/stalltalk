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

const DEMO_CONTENT = {
  heroTitle: "Your quick city guide while you take five.",
  intro: "Fresh local bites, quick laughs, useful venue tips, and eight sponsor offers that are easy to tap without interrupting the read.",
  featuredTitle: "The Two-Minute Guide to Winning the Line",
  article: "Keep your crew moving: pick a meeting spot, screenshot your tickets, hydrate before the encore, and never trust a casino hallway that says the exit is only one more turn away.",
  joke: "Why did the restroom magazine get promoted? It had excellent stall presence.",
  quote: "“Make the most of the pause; even a quick stop can point you toward the next good thing.”",
  word: "Serendipity — finding something good while looking for something else.",
  deal: "Show this issue at a participating local spot for a surprise restroom-reader perk.",
  event: "Look for a pop-up performance, late-night menu, or photo-worthy stop near the venue before heading home.",
  trivia: "Las Vegas has more hotel rooms than many entire cities.\nNeon signs glow through electrified gas in glass tubes.\nA good restroom publication should be readable in under two minutes.",
};

let activeAd = null;

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch (error) {
    console.warn(`Unable to read ${key}`, error);
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function timestamp() {
  return new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function getSettings() {
  return { ...DEFAULT_SETTINGS, ...readJson(STORAGE_KEYS.settings, DEFAULT_SETTINGS) };
}

function getContentValues() {
  const formData = new FormData(document.querySelector("#content-form"));
  return Object.fromEntries(Object.keys(DEMO_CONTENT).map((key) => [key, String(formData.get(key) || "").trim()]));
}

function setContentValues(content) {
  const form = document.querySelector("#content-form");
  Object.entries({ ...DEMO_CONTENT, ...content }).forEach(([key, value]) => {
    const field = form.elements[key];
    if (field) field.value = value;
  });
}

function getAdSlots() {
  return readJson(STORAGE_KEYS.ads, {});
}

function renderDashboard() {
  const settings = getSettings();
  const published = readJson(STORAGE_KEYS.published, null);
  const draft = readJson(STORAGE_KEYS.draft, null);
  const slots = getAdSlots();
  document.querySelector("#dashboard-issue-title").textContent = `${settings.brand} #${settings.issueNumber}`;
  document.querySelector("#dashboard-issue-meta").textContent = `${settings.city} • ${settings.venue} • ${settings.monthYear}`;
  document.querySelector("#dashboard-published-status").textContent = published ? "Published" : "Demo content loaded";
  document.querySelector("#dashboard-last-saved").textContent = `Last saved: ${published?.savedAt || draft?.savedAt || "Not yet saved"}`;

  const grid = document.querySelector("#dashboard-slot-status");
  grid.replaceChildren(...Array.from({ length: 8 }, (_, index) => {
    const slotNumber = String(index + 1);
    const pill = document.createElement("span");
    pill.className = slots[slotNumber] ? "slot-pill is-filled" : "slot-pill";
    pill.textContent = `Ad Slot ${slotNumber}: ${slots[slotNumber]?.businessName || "Open"}`;
    return pill;
  }));
}

function renderPublishedSlotGrid() {
  const slots = getAdSlots();
  const grid = document.querySelector("#published-slot-grid");
  grid.replaceChildren(...Array.from({ length: 8 }, (_, index) => {
    const slotNumber = String(index + 1);
    const card = document.createElement("article");
    card.className = "published-slot-card";
    const ad = slots[slotNumber];
    if (ad && window.StallTalkGraphicAds) {
      card.append(window.StallTalkGraphicAds.build(ad, { slotNumber, compact: true, link: false }));
    } else {
      card.innerHTML = `<span>Ad Slot ${slotNumber}</span><strong>Open inventory</strong><small>Generate an ad, choose this slot, and apply.</small>`;
    }
    return card;
  }));
}

function refreshPreview() {
  const iframe = document.querySelector("#public-preview");
  if (iframe) iframe.src = `../index.html?preview=${Date.now()}`;
}

function refreshAdmin() {
  renderDashboard();
  renderPublishedSlotGrid();
  refreshPreview();
}

function switchTab(tabName) {
  document.querySelectorAll(".tab-button").forEach((button) => button.classList.toggle("is-active", button.dataset.tab === tabName));
  document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.toggle("is-active", panel.id === tabName));
}

function generateContent() {
  const settings = getSettings();
  const content = {
    heroTitle: `${settings.venue} quick reads for a better ${settings.city} stop.`,
    intro: `Welcome to ${settings.brand}: polished restroom-sized stories, useful venue tips, and sponsor deals curated for ${settings.monthYear}.`,
    featuredTitle: `How to Make the Most of ${settings.venue} in Two Minutes`,
    article: `Use this pause to regroup. Pick a landmark, check the next event time, grab water, and choose one local detour before the night gets busy again. The best ${settings.city} plans are simple enough to explain in one text.`,
    joke: "Why did the toilet paper avoid spoilers? It wanted every roll to have a fresh twist.",
    quote: "“A smart pause can turn a busy night into a better story.”",
    word: "Wayfinding — the art of finding your next best stop without wandering in circles.",
    deal: `Ask a nearby sponsor about the ${settings.brand} reader perk before you leave ${settings.venue}.`,
    event: `Tonight's move: find one photo-worthy sign, one shareable snack, and one comfortable meetup point near ${settings.venue}.`,
    trivia: `${settings.city} rewards short detours.\nThe best mobile articles are scannable at arm's length.\nSponsor slots work best when the offer is obvious in three seconds.`,
  };
  setContentValues(content);
  document.querySelector("#content-status").textContent = "Generated fresh local issue copy. Review, save draft, or publish.";
}

function saveDraft() {
  const draft = { ...getContentValues(), savedAt: timestamp() };
  saveJson(STORAGE_KEYS.draft, draft);
  document.querySelector("#content-status").textContent = "Draft saved locally.";
  refreshAdmin();
}

function publishContent() {
  const published = { ...getContentValues(), savedAt: timestamp() };
  saveJson(STORAGE_KEYS.published, published);
  // Future backend/database publishing will POST this payload to an authenticated issue endpoint.
  document.querySelector("#content-status").textContent = "Published. Open the public issue in this browser to see it.";
  refreshAdmin();
}

function resetDemoContent() {
  setContentValues(DEMO_CONTENT);
  saveJson(STORAGE_KEYS.draft, { ...DEMO_CONTENT, savedAt: timestamp() });
  document.querySelector("#content-status").textContent = "Demo content restored as the current draft.";
  refreshAdmin();
}

function collectAdValues() {
  const formData = new FormData(document.querySelector("#ad-form"));
  const businessName = String(formData.get("businessName") || "Potty Favor Sponsor").trim();
  const offer = String(formData.get("offer") || "A reader-only local offer").trim();
  const style = String(formData.get("style") || "Bold").trim();
  const primaryColor = String(formData.get("primaryColor") || "#ff2d2d");
  const accentColor = String(formData.get("accentColor") || "#7c2cff");

  return {
    adMode: "html",
    businessName,
    businessCategory: String(formData.get("businessCategory") || "Local Favorite").trim(),
    offer,
    couponCode: String(formData.get("couponCode") || businessName.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase() + "10").trim(),
    website: String(formData.get("website") || "").trim(),
    targetAudience: String(formData.get("targetAudience") || "nearby readers").trim(),
    style,
    tone: style,
    template: style === "Luxury" ? "luxury" : style === "Funny" ? "coupon" : "vegas",
    adSize: "Banner 1792x1024",
    primaryColor,
    secondaryColor: "#ffd400",
    accentColor,
    headline: `${businessName}: ${offer}`,
    subheadline: `A ${style.toLowerCase()} offer built for ${String(formData.get("targetAudience") || "nearby readers").trim()}.`,
    ctaButtonText: "Claim This Deal",
    generatedAt: timestamp(),
  };
}

function renderAdPreview(ad) {
  const preview = document.querySelector("#ad-preview");
  preview.replaceChildren(window.StallTalkGraphicAds.build(ad, { link: false }));
}

function generateAd() {
  activeAd = collectAdValues();
  renderAdPreview(activeAd);
  document.querySelector("#ad-status").textContent = "Generated graphic ad preview. Choose a slot and apply.";
}

function applySlot() {
  if (!activeAd) generateAd();
  const slotNumber = document.querySelector("#slot-select").value;
  const slots = getAdSlots();
  slots[slotNumber] = { ...activeAd, savedAt: timestamp() };
  saveJson(STORAGE_KEYS.ads, slots);
  // Future backend/database publishing will upsert this ad creative into a paid slot table.
  document.querySelector("#ad-status").textContent = `Applied ${activeAd.businessName} to Ad Slot ${slotNumber}.`;
  refreshAdmin();
}

function clearSlot() {
  const slotNumber = document.querySelector("#slot-select").value;
  const slots = getAdSlots();
  delete slots[slotNumber];
  saveJson(STORAGE_KEYS.ads, slots);
  document.querySelector("#ad-status").textContent = `Cleared Ad Slot ${slotNumber}.`;
  refreshAdmin();
}

function loadSettingsForm() {
  const settings = getSettings();
  const form = document.querySelector("#settings-form");
  Object.entries(settings).forEach(([key, value]) => {
    const field = form.elements[key];
    if (!field) return;
    if (field instanceof RadioNodeList) field.value = value;
    else field.value = value;
  });
}

function saveSettings() {
  const formData = new FormData(document.querySelector("#settings-form"));
  const settings = { ...DEFAULT_SETTINGS, ...Object.fromEntries(formData.entries()), savedAt: timestamp() };
  saveJson(STORAGE_KEYS.settings, settings);
  // Future backend/database publishing will persist issue metadata with the published issue record.
  document.querySelector("#settings-status").textContent = "Settings saved. Public issue branding updated in this browser.";
  refreshAdmin();
}

function init() {
  setContentValues(readJson(STORAGE_KEYS.draft, readJson(STORAGE_KEYS.published, DEMO_CONTENT)));
  loadSettingsForm();
  generateAd();
  refreshAdmin();

  document.querySelectorAll(".tab-button").forEach((button) => button.addEventListener("click", () => switchTab(button.dataset.tab)));
  document.querySelectorAll("[data-go-tab]").forEach((button) => button.addEventListener("click", () => switchTab(button.dataset.goTab)));
  document.querySelector("#ai-generate-content").addEventListener("click", generateContent);
  document.querySelector("#save-draft").addEventListener("click", saveDraft);
  document.querySelector("#publish-content").addEventListener("click", publishContent);
  document.querySelector("#dashboard-publish").addEventListener("click", publishContent);
  document.querySelector("#reset-demo").addEventListener("click", resetDemoContent);
  document.querySelector("#generate-ad").addEventListener("click", generateAd);
  document.querySelector("#apply-slot").addEventListener("click", applySlot);
  document.querySelector("#clear-slot").addEventListener("click", clearSlot);
  document.querySelector("#save-settings").addEventListener("click", saveSettings);
}

init();
