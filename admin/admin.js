const STORAGE_KEYS = {
  draft: "stalltalk_content_draft",
  published: "stalltalk_content_published",
  ads: window.StallTalkGraphicAds?.storageKey || "stalltalk_ad_slots",
  campaignHistory: "stalltalk_campaign_history",
  campaigns: "stalltalk_campaigns",
  settings: "stalltalk_settings",
  apiBaseUrl: "stalltalk_api_base_url",
  legacySettings: "stalltalk_issue_settings",
  venues: "stalltalk_venues",
  qrLocations: "stalltalk_qr_locations",
  issues: "stalltalk_issues",
  advertisers: "stalltalk_advertisers",
  analyticsEvents: "stalltalk_analytics_events",
  distributors: "stalltalk_distributors",
};

const DEFAULT_SETTINGS = {
  activeBrand: "Potty Favor",
  brand: "Potty Favor",
  logoText: "Potty Favor",
  tagline: "A polished restroom read from Stall Talk.",
  colorTheme: "vegas-neon",
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
let isGeneratingGraphic = false;

function readJson(key, fallback) {
  const raw = localStorage.getItem(key);
  if (raw === null || raw === "") return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
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

function createdAt() {
  return new Date().toISOString();
}

function safeText(value, fallback = "") {
  return String(value || "").trim() || fallback;
}


function normalizeApiBaseUrl(value) {
  return safeText(value).replace(/\/+$/, "");
}

function isConfiguredApiBaseUrl(value) {
  const baseUrl = normalizeApiBaseUrl(value);
  return /^https?:\/\//i.test(baseUrl) && !baseUrl.includes("YOUR-VERCEL-DEPLOYMENT-URL");
}

function configuredApiBaseUrl() {
  const localValue = normalizeApiBaseUrl(localStorage.getItem(STORAGE_KEYS.apiBaseUrl));
  if (isConfiguredApiBaseUrl(localValue)) return localValue;
  const globalValue = normalizeApiBaseUrl(window.STALLTALK_API_BASE_URL);
  return isConfiguredApiBaseUrl(globalValue) ? globalValue : "";
}

function aiEndpointUrl(path = "/api/generate-ad-image") {
  const baseUrl = configuredApiBaseUrl();
  return baseUrl ? `${baseUrl}${path.startsWith("/") ? path : `/${path}`}` : "";
}

function getAdImageEndpoint() {
  return aiEndpointUrl("/api/generate-ad-image");
}

function setApiEndpointStatus(message = "") {
  const endpoint = getAdImageEndpoint();
  const status = document.querySelector("#ai-endpoint-status");
  const settingsField = document.querySelector('#settings-form [name="apiBaseUrl"]');
  const endpointText = endpoint || "Not configured";

  if (settingsField && !settingsField.value) {
    settingsField.value = normalizeApiBaseUrl(localStorage.getItem(STORAGE_KEYS.apiBaseUrl)) || normalizeApiBaseUrl(window.STALLTALK_API_BASE_URL);
  }

  if (status) {
    const connectedText = endpoint ? "Connected" : "Not Connected";
    status.innerHTML = `<strong>AI Image Endpoint: ${connectedText}</strong><span>${endpointText}</span>${message ? `<small>${message}</small>` : ""}`;
    status.classList.toggle("is-connected", Boolean(endpoint));
  }

  const help = document.querySelector("#ai-endpoint-help");
  if (help) {
    help.textContent = endpoint
      ? `Generate Graphic Ad will call ${endpoint}`
      : "Paste your Vercel base URL in Settings → AI Image API Endpoint before generating an OpenAI image ad.";
  }
}

function updatePublishButtons() {
  const canPublish = activeAd?.adMode === "image" && Boolean(activeAd.imageAdUrl || activeAd.imageAdBase64);
  document.querySelectorAll("[data-publish-slot], #apply-slot").forEach((button) => {
    button.disabled = !canPublish;
    button.title = canPublish ? "" : "Generate a real OpenAI image ad before publishing.";
  });
}

function cleanBusinessDisplayName(value) {
  const displayName = safeText(value, "Your Business")
    .replace(/\b(LLC|L\.?L\.?C\.?|Inc\.?|Incorporated|Company|Co\.?)\b/gi, "")
    .replace(/[,&]\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (displayName.length <= 28) return displayName;
  return displayName.slice(0, 28).replace(/\s+\S*$/, "").trim() || displayName.slice(0, 28);
}

function offerHeadline(value) {
  const offer = safeText(value, "15% off first order");
  const percentMatch = offer.match(/\b\d+\s*%\s*off\b/i);
  const firstOrder = /first\s+order/i.test(offer);
  if (percentMatch || firstOrder) return [percentMatch ? percentMatch[0].replace(/\s+/g, " ") : "15% OFF", firstOrder ? "FIRST ORDER" : ""].filter(Boolean).join("\n").toUpperCase();
  return offer.toUpperCase();
}

function getSettings() {
  return { ...DEFAULT_SETTINGS, ...readJson(STORAGE_KEYS.legacySettings, {}), ...readJson(STORAGE_KEYS.settings, {}) };
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
  const slots = readJson(STORAGE_KEYS.ads, {});
  if (!Array.isArray(slots)) return slots;
  const campaigns = ensureArray(STORAGE_KEYS.campaigns);
  return Object.fromEntries(slots.map((slot) => {
    const campaign = campaigns.find((item) => item.id === (slot.campaignId || slot.campaignAssigned));
    return [String(slot.slotNumber), campaign ? { ...campaign, slotPublishedTo: String(slot.slotNumber) } : null];
  }).filter(([, ad]) => ad));
}

function getCampaignHistory() {
  return readJson(STORAGE_KEYS.campaignHistory, []);
}

function formValue(formData, key, fallback = "") {
  return safeText(formData.get(key), fallback);
}

function adSizeKey(value) {
  return window.StallTalkGraphicAds?.adSizeKey(value) || "banner";
}

function buildCouponCode(businessName, value) {
  return safeText(value, `${businessName.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase() || "STALL"}10`);
}

function collectAdValues() {
  const formData = new FormData(document.querySelector("#ad-form"));
  const businessName = formValue(formData, "businessName", "Potty Favor Sponsor");
  const offer = formValue(formData, "offer", "A reader-only local offer");
  const tone = formValue(formData, "tone", "Bold");
  const audience = formValue(formData, "audience", "nearby readers");
  const brandColors = formValue(formData, "brandColors", "#ff2d2d, #ffd400, #7c2cff");
  const colors = brandColors.split(",").map((color) => color.trim()).filter(Boolean);
  const primaryColor = colors[0] || "#ff2d2d";
  const secondaryColor = colors[1] || "#ffd400";
  const accentColor = colors[2] || "#7c2cff";
  const couponCode = buildCouponCode(businessName, formData.get("couponCode"));
  const ctaText = formValue(formData, "cta", "Claim This Deal");
  const sizeLabel = formValue(formData, "adSize", "Banner");

  return {
    adMode: "pending",
    businessName,
    businessCategory: formValue(formData, "businessCategory", "Local Favorite"),
    category: formValue(formData, "businessCategory", "Local Favorite"),
    offer,
    couponCode,
    expiration: formValue(formData, "expiration"),
    website: formValue(formData, "website"),
    phone: formValue(formData, "phone"),
    audience,
    targetAudience: audience,
    tone,
    style: tone,
    visualStyle: formValue(formData, "visualStyle", "Polished modern editorial"),
    optionalLogoUrl: formValue(formData, "optionalLogoUrl"),
    brandColors,
    template: tone === "Luxury" ? "luxury" : tone === "Funny" ? "coupon" : "vegas",
    adSize: sizeLabel,
    adSizeKey: adSizeKey(sizeLabel),
    primaryColor,
    secondaryColor,
    accentColor,
    businessDisplayName: cleanBusinessDisplayName(businessName),
    headline: offerHeadline(offer),
    subheadline: `A ${tone.toLowerCase()} offer from ${cleanBusinessDisplayName(businessName)} built for ${audience}.`,
    ctaButtonText: ctaText,
    ctaText,
    disclaimer: "Valid while supplies last. Terms may apply.",
    generatedAt: timestamp(),
    createdAt: createdAt(),
  };
}

function campaignSummary(ad) {
  return {
    businessName: ad.businessName,
    offer: ad.offer,
    adSize: ad.adSize,
    imageUrl: ad.imageAdUrl || ad.imageUrl || "",
    imageBase64: ad.imageAdBase64 || "",
    promptUsed: ad.promptUsed || "",
    createdAt: ad.createdAt || createdAt(),
    slotPublishedTo: ad.slotPublishedTo,
    headline: ad.headline,
    subheadline: ad.subheadline,
    ctaText: ad.ctaText || ad.ctaButtonText,
    couponCode: ad.couponCode,
    adMode: ad.adMode,
  };
}

function saveCampaign(ad = activeAd) {
  if (!ad) return;
  const history = getCampaignHistory();
  const next = [campaignSummary(ad), ...history].slice(0, 24);
  saveJson(STORAGE_KEYS.campaignHistory, next);
  const campaign = upsertCampaignFromCreative(ad);
  renderCampaignHistory();
  document.querySelector("#ad-status").textContent = `Saved ${ad.businessName} to campaign history.`;
  return campaign;
}

function setGraphicLoading(loading) {
  isGeneratingGraphic = loading;
  const generateButton = document.querySelector("#generate-ad");
  const regenerateButton = document.querySelector("#regenerate-ad");
  [generateButton, regenerateButton].forEach((button) => {
    if (!button) return;
    button.disabled = loading;
    button.classList.toggle("is-loading", loading);
  });
  if (generateButton) generateButton.textContent = loading ? "Generating Graphic…" : "Generate Graphic Ad";
}

function applyEditableCopyToActiveAd() {
  if (!activeAd) return;
  activeAd.headline = safeText(document.querySelector("#preview-headline")?.value, activeAd.headline);
  activeAd.subheadline = safeText(document.querySelector("#preview-subheadline")?.value, activeAd.subheadline);
  activeAd.ctaText = safeText(document.querySelector("#preview-cta")?.value, activeAd.ctaText || activeAd.ctaButtonText);
  activeAd.ctaButtonText = activeAd.ctaText;
  activeAd.couponCode = safeText(document.querySelector("#preview-coupon")?.value, activeAd.couponCode);
}

function renderPrompt(prompt) {
  const promptBox = document.querySelector("#prompt-used");
  if (!promptBox) return;
  promptBox.hidden = !prompt;
  promptBox.textContent = prompt ? `Prompt used: ${prompt}` : "";
}

function renderAdPreview(ad) {
  const preview = document.querySelector("#ad-preview");
  preview.replaceChildren(window.StallTalkGraphicAds.build(ad, { link: false }));
  document.querySelector("#preview-headline").value = ad.headline || "";
  document.querySelector("#preview-subheadline").value = ad.subheadline || "";
  document.querySelector("#preview-cta").value = ad.ctaText || ad.ctaButtonText || "";
  document.querySelector("#preview-coupon").value = ad.couponCode || "";
  renderPrompt(ad.promptUsed || "");
  updatePublishButtons();
}

function generateCopy() {
  activeAd = collectAdValues();
  renderAdPreview(activeAd);
  document.querySelector("#ad-status").textContent = "Generated editable ad copy. Generate Graphic Ad to create an OpenAI image file; no HTML/CSS fallback will be published.";
}

async function generateGraphicAd() {
  if (isGeneratingGraphic) return;
  const draftAd = collectAdValues();
  activeAd = draftAd;
  setGraphicLoading(true);
  const endpoint = getAdImageEndpoint();
  setApiEndpointStatus();
  if (!endpoint) {
    activeAd = { ...draftAd, adMode: "pending", promptUsed: "AI image endpoint is not configured." };
    renderAdPreview(activeAd);
    document.querySelector("#ad-status").textContent = "AI Image API Endpoint is not configured. Paste your Vercel base URL in Settings, save it, then retry OpenAI image generation.";
    setGraphicLoading(false);
    return;
  }
  document.querySelector("#ad-status").textContent = `Generating finished graphic ad with ${endpoint}…`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draftAd),
    });
    const contentType = response.headers.get("content-type") || "";
    let data = null;

    if (!response.ok) {
      if (!contentType.includes("application/json")) {
        throw new Error(`AI image generation failed with HTTP ${response.status} ${response.statusText || ""}. The AI endpoint returned HTML instead of JSON. Check that your Vercel URL is configured.`.trim());
      }
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error(`AI image generation failed with HTTP ${response.status} ${response.statusText || ""}. The endpoint did not return valid JSON.`.trim());
      }
      const diagnostic = data?.diagnostic || {};
      const details = [
        `AI image generation failed with HTTP ${response.status} ${response.statusText || ""}`.trim(),
        data?.error || "",
        diagnostic.apiStatus ? `API: ${diagnostic.apiStatus}` : "",
        diagnostic.openAiStatus ? `OpenAI: ${diagnostic.openAiStatus}` : "",
        diagnostic.model ? `Model: ${diagnostic.model}` : "",
        diagnostic.errorType ? `Type: ${diagnostic.errorType}` : "",
        diagnostic.openAiStatusCode ? `OpenAI HTTP: ${diagnostic.openAiStatusCode}` : "",
      ].filter(Boolean).join(" • ");
      throw new Error(details);
    }

    if (!contentType.includes("application/json")) {
      throw new Error("The AI endpoint returned HTML instead of JSON. Check that your Vercel URL is configured.");
    }

    try {
      data = await response.json();
    } catch (parseError) {
      throw new Error("The AI endpoint returned invalid JSON. Check that your Vercel URL is configured.");
    }

    const imageUrl = safeText(data.imageUrl);
    const imageBase64 = safeText(data.imageBase64);
    if (!imageUrl && !imageBase64) {
      throw new Error("The AI endpoint returned JSON but did not include a generated image.");
    }
    activeAd = {
      ...draftAd,
      adMode: "image",
      imageAdUrl: imageUrl,
      imageAdBase64: imageBase64,
      promptUsed: safeText(data.promptUsed || data.prompt),
      businessDisplayName: cleanBusinessDisplayName(data.businessDisplayName || draftAd.businessName),
      headline: offerHeadline(data.headline || draftAd.offer),
      subheadline: safeText(data.subheadline, draftAd.subheadline),
      ctaText: safeText(data.ctaText, draftAd.ctaText),
      ctaButtonText: safeText(data.ctaText, draftAd.ctaButtonText),
      couponCode: safeText(data.couponCode, draftAd.couponCode),
      disclaimer: safeText(data.disclaimer, draftAd.disclaimer),
      generatedAt: timestamp(),
      createdAt: createdAt(),
    };
    renderAdPreview(activeAd);
    saveCampaign(activeAd);
    document.querySelector("#ad-status").textContent = "Generated finished image ad. Review copy, save, or publish to slots 1–8.";
  } catch (error) {
    console.error("Graphic ad generation failed", error);
    activeAd = { ...draftAd, adMode: "pending", promptUsed: draftAd.promptUsed || "OpenAI image generation did not complete." };
    renderAdPreview(activeAd);
    document.querySelector("#ad-status").textContent = `${error.message} No HTML/CSS fallback was generated. Fix the API status, then retry OpenAI image generation.`;
  } finally {
    setGraphicLoading(false);
  }
}

function publishToSlot(slotNumber) {
  if (!activeAd) generateCopy();
  applyEditableCopyToActiveAd();
  if (activeAd.adMode !== "image") {
    document.querySelector("#ad-status").textContent = "OpenAI image creative required before publishing. No HTML/CSS fallback can be published.";
    return;
  }
  const publishedAd = { ...activeAd, slotPublishedTo: String(slotNumber), savedAt: timestamp() };
  const campaign = saveCampaign(publishedAd);
  const slots = getNetworkAdSlots().map((slot) => String(slot.slotNumber) === String(slotNumber) ? { ...slot, availability: "sold", advertiserAssigned: publishedAd.businessName, campaignAssigned: campaign?.id || publishedAd.businessName, campaignId: campaign?.id || "", advertiserId: campaign?.advertiserId || "", startDate: new Date().toISOString().slice(0, 10), endDate: publishedAd.expiration || "" } : slot);
  setNetworkAdSlots(slots);
  document.querySelector("#ad-status").textContent = `Published ${publishedAd.businessName} to Ad Slot ${slotNumber}.`;
  refreshAdmin();
}

function applySlot() {
  publishToSlot(document.querySelector("#slot-select").value);
}

function clearSlot() {
  const slotNumber = document.querySelector("#slot-select").value;
  const slots = getNetworkAdSlots().map((slot) => String(slot.slotNumber) === String(slotNumber) ? { ...slot, availability: "open", advertiserAssigned: "", campaignAssigned: "", campaignId: "", advertiserId: "", startDate: "", endDate: "" } : slot);
  setNetworkAdSlots(slots);
  document.querySelector("#ad-status").textContent = `Cleared Ad Slot ${slotNumber}.`;
  refreshAdmin();
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
    const mode = slots[slotNumber]?.adMode === "image" ? "image" : "not generated";
    pill.textContent = `Ad Slot ${slotNumber}: ${slots[slotNumber]?.businessName || "Open"}${slots[slotNumber] ? ` (${mode})` : ""}`;
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
      card.innerHTML = `<span>Ad Slot ${slotNumber}</span><strong>Open inventory</strong><small>Generate an ad, choose this slot, and publish.</small>`;
    }
    return card;
  }));
}

function renderCampaignHistory() {
  const list = document.querySelector("#campaign-history");
  if (!list) return;
  const campaigns = getCampaignHistory();
  if (!campaigns.length) {
    list.innerHTML = "<p class=\"help-copy\">No saved campaigns yet. Generate or save a campaign to keep it here.</p>";
    return;
  }

  list.replaceChildren(...campaigns.map((campaign) => {
    const item = document.createElement("article");
    item.className = "campaign-history-item";
    const mode = campaign.adMode === "image" ? "Image ad" : "Not generated";
    item.innerHTML = `
      <div>
        <strong>${safeText(campaign.businessName, "Untitled campaign")}</strong>
        <span>${safeText(campaign.offer, "No offer")}</span>
        <small>${mode} • ${safeText(campaign.adSize, "Banner")} • ${new Date(campaign.createdAt).toLocaleString()}${campaign.slotPublishedTo ? ` • Slot ${campaign.slotPublishedTo}` : ""}</small>
      </div>
    `;
    return item;
  }));
}

function refreshPreview() {
  const iframe = document.querySelector("#public-preview");
  if (iframe) iframe.src = `../index.html?preview=${Date.now()}`;
}

function refreshAdmin() {
  renderDashboard();
  renderPublishedSlotGrid();
  renderCampaignHistory();
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
    deal: `Ask a nearby sponsor about a ${settings.brand} reader perk before you leave ${settings.venue}.`,
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
  const formSettings = Object.fromEntries(formData.entries());
  const apiBaseUrl = normalizeApiBaseUrl(formSettings.apiBaseUrl);
  if (apiBaseUrl) localStorage.setItem(STORAGE_KEYS.apiBaseUrl, apiBaseUrl);
  else localStorage.removeItem(STORAGE_KEYS.apiBaseUrl);
  delete formSettings.apiBaseUrl;
  const settings = { ...DEFAULT_SETTINGS, ...formSettings, brand: formSettings.activeBrand || formSettings.logoText || DEFAULT_SETTINGS.brand, savedAt: timestamp() };
  saveJson(STORAGE_KEYS.settings, settings);
  setApiEndpointStatus(apiBaseUrl ? "Saved locally in this browser." : "Endpoint cleared.");
  // Future backend/database publishing will persist issue metadata with the published issue record.
  document.querySelector("#settings-status").textContent = "Settings saved. Public issue branding updated in this browser.";
  refreshAdmin();
}



const SLOT_DEFAULTS = [
  { slotNumber: 1, placementName: "Top Sponsor", size: "hero", price: 250 },
  { slotNumber: 2, placementName: "Inline Sponsor", size: "inline", price: 150 },
  { slotNumber: 3, placementName: "Inline Sponsor", size: "inline", price: 150 },
  { slotNumber: 4, placementName: "Inline Sponsor", size: "inline", price: 150 },
  { slotNumber: 5, placementName: "Inline Sponsor", size: "inline", price: 150 },
  { slotNumber: 6, placementName: "Inline Sponsor", size: "inline", price: 150 },
  { slotNumber: 7, placementName: "Inline Sponsor", size: "inline", price: 150 },
  { slotNumber: 8, placementName: "Footer Sponsor", size: "footer", price: 200 },
];

function slugify(value) {
  return safeText(value).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function monthName() {
  return new Date().toLocaleString("en", { month: "long" });
}

function currentYear() {
  return String(new Date().getFullYear());
}

function ensureArray(key) {
  const value = readJson(key, []);
  return Array.isArray(value) ? value : [];
}

function demoNetworkData() {
  const venues = [
    { id: "venue-mgm", name: "MGM Grand Las Vegas", slug: "mgm-grand-las-vegas", businessType: "Casino resort", address: "3799 S Las Vegas Blvd", city: "Las Vegas", state: "NV", contactName: "Venue Partnerships", contactEmail: "partners@mgm.example", contactPhone: "702-555-0101", status: "active", notes: "Flagship Strip casino route." },
    { id: "venue-brewdog", name: "BrewDog Las Vegas", slug: "brewdog-las-vegas", businessType: "Rooftop bar", address: "3767 S Las Vegas Blvd", city: "Las Vegas", state: "NV", contactName: "BrewDog Marketing", contactEmail: "vegas@brewdog.example", contactPhone: "702-555-0102", status: "active", notes: "High tourist foot traffic." },
    { id: "venue-gilleys", name: "Gilley’s Saloon", slug: "gilleys-saloon", businessType: "Saloon / entertainment", address: "3300 S Las Vegas Blvd", city: "Las Vegas", state: "NV", contactName: "Events Manager", contactEmail: "events@gilleys.example", contactPhone: "702-555-0103", status: "active", notes: "Country nightlife audience." },
    { id: "venue-lee-canyon", name: "Lee Canyon", slug: "lee-canyon", businessType: "Outdoor recreation", address: "6725 Lee Canyon Rd", city: "Las Vegas", state: "NV", contactName: "Guest Experience", contactEmail: "guest@leecanyon.example", contactPhone: "702-555-0104", status: "active", notes: "Seasonal ski and mountain visitors." },
  ];
  const qrLocations = venues.flatMap((venue) => [
    { qrId: venue.id === "venue-mgm" ? "ST-MGM-CASINO-M-001" : "mens-stall-1", venueId: venue.id, locationName: "Men’s restroom stall 1", placementType: "stall-door", targetUrl: `/?venue=${venue.slug}&qr=${venue.id === "venue-mgm" ? "ST-MGM-CASINO-M-001" : "mens-stall-1"}`, active: true, scanCount: 0 },
    { qrId: "womens-stall-1", venueId: venue.id, locationName: "Women’s restroom stall 1", placementType: "stall-door", targetUrl: `/?venue=${venue.slug}&qr=womens-stall-1`, active: true, scanCount: 0 },
    { qrId: "mirror-1", venueId: venue.id, locationName: "Mirror sponsor frame", placementType: "mirror", targetUrl: `/?venue=${venue.slug}&qr=mirror-1`, active: true, scanCount: 0 },
  ]);
  const advertisers = ["BrewDog Las Vegas", "United Painters Worldwide", "Box Chairs", "RecordPathAI", "Perfect Dream Modular", "Outdoor Events Association", "Hooters", "Lee Canyon"].map((name, index) => ({
    id: `adv-${slugify(name)}`, businessName: name, category: ["Food & beverage", "Trade association", "Events", "AI software", "Modular homes", "Outdoor events", "Restaurant", "Recreation"][index], contactName: "Marketing Team", email: `ads@${slugify(name)}.example`, phone: `702-555-01${10 + index}`, website: `https://${slugify(name)}.example`, status: "active", notes: "Demo advertiser", assignedVenues: venues.map((v) => v.id), assignedCampaigns: [], monthlySpend: index === 0 ? 400 : 150,
  }));
  const campaigns = advertisers.map((adv, index) => ({
    id: `camp-${slugify(adv.businessName)}`, advertiserId: adv.id, advertiserName: adv.businessName, offer: ["Show this screen for a reader pint perk", "Paint smarter with national pros", "Premium seats for outdoor events", "Turn records into AI-ready workflows", "Design your perfect modular dream", "Join the outdoor event operator network", "Wings, sports, and late-night specials", "Mountain escapes minutes from Vegas"][index], couponCode: `${slugify(adv.businessName).slice(0, 6).toUpperCase()}20`, startDate: `${currentYear()}-06-01`, endDate: `${currentYear()}-12-31`, selectedVenues: venues.map((v) => v.id), selectedSlots: [String((index % 8) + 1)], creativeImages: [], status: "active", createdAt: createdAt(), businessName: adv.businessName, headline: `${adv.businessName} restroom-reader offer`, subheadline: "Premium local media placement", ctaText: "Tap for offer", adMode: "html", primaryColor: ["#ff6b00", "#2354ff", "#7c2cff", "#0a7cff"][index % 4], secondaryColor: "#ffd400", accentColor: "#111111" }));
  const adSlots = SLOT_DEFAULTS.map((slot, index) => {
    const campaign = campaigns[index];
    return { ...slot, id: `slot-${slot.slotNumber}`, availability: "sold", advertiserAssigned: campaign.advertiserName, campaignAssigned: campaign.id, campaignId: campaign.id, advertiserId: campaign.advertiserId, venueIds: venues.map((v) => v.id), startDate: campaign.startDate, endDate: campaign.endDate };
  });
  const issues = venues.map((venue) => ({
    id: `issue-${venue.slug}`, title: `${monthName()} ${currentYear()} ${venue.name} Potty Favor`, month: monthName(), year: currentYear(), city: venue.city, venueId: venue.id, venueName: venue.name, status: "published", contentBlocks: ["Your quick city guide while you take five.", `Fresh picks and restroom-reader perks at ${venue.name}.`, "Hydrate, find your crew, and tap an offer before your next stop."], assignedAdSlots: ["1", "2", "3", "4", "5", "6", "7", "8"], publishedAt: createdAt(), duplicatedFrom: "" }));
  const distributors = [{ id: "dist-las-vegas-strip", name: "Las Vegas Strip Distributor", city: "Las Vegas", state: "NV", email: "strip@stalltalk.example", phone: "702-555-0199", assignedVenues: venues.map((v) => v.id), commissionRate: 0.2 }];
  return { venues, qrLocations, advertisers, campaigns, adSlots, issues, distributors };
}

function seedDemoNetwork(force = false) {
  const demo = demoNetworkData();
  const map = { venues: STORAGE_KEYS.venues, qrLocations: STORAGE_KEYS.qrLocations, advertisers: STORAGE_KEYS.advertisers, campaigns: STORAGE_KEYS.campaigns, adSlots: STORAGE_KEYS.ads, issues: STORAGE_KEYS.issues, distributors: STORAGE_KEYS.distributors };
  Object.entries(map).forEach(([name, key]) => {
    if (force || !localStorage.getItem(key)) saveJson(key, demo[name]);
  });
  if (!force) {
    const qrLocations = ensureArray(STORAGE_KEYS.qrLocations);
    if (!qrLocations.some((qr) => qr.qrId === "ST-MGM-CASINO-M-001")) saveJson(STORAGE_KEYS.qrLocations, [demo.qrLocations[0], ...qrLocations]);
  }
  if (force || !localStorage.getItem(STORAGE_KEYS.settings)) saveJson(STORAGE_KEYS.settings, { ...DEFAULT_SETTINGS, savedAt: timestamp() });
  if (force || !localStorage.getItem(STORAGE_KEYS.published)) saveJson(STORAGE_KEYS.published, DEMO_CONTENT);
}

function getNetworkAdSlots() {
  const slots = readJson(STORAGE_KEYS.ads, []);
  if (Array.isArray(slots)) return slots;
  return SLOT_DEFAULTS.map((slot) => ({ ...slot, id: `slot-${slot.slotNumber}`, availability: slots[String(slot.slotNumber)] ? "sold" : "open", campaignAssigned: slots[String(slot.slotNumber)]?.businessName || "", advertiserAssigned: slots[String(slot.slotNumber)]?.businessName || "" }));
}

function setNetworkAdSlots(slots) { saveJson(STORAGE_KEYS.ads, slots); }

function activeCampaigns() { return ensureArray(STORAGE_KEYS.campaigns).filter((campaign) => campaign.status === "active"); }

function revenueForSlot(slot) { return slot.availability === "sold" || slot.campaignAssigned || slot.campaignId ? Number(slot.price || 0) : 0; }

function revenueSummary() {
  const slots = getNetworkAdSlots();
  const campaigns = activeCampaigns();
  const venues = ensureArray(STORAGE_KEYS.venues);
  const advertisers = ensureArray(STORAGE_KEYS.advertisers);
  const activeSlotRevenue = slots.reduce((sum, slot) => sum + revenueForSlot(slot), 0);
  const openSlotOpportunity = slots.reduce((sum, slot) => sum + (revenueForSlot(slot) ? 0 : Number(slot.price || 0)), 0);
  return { slots, campaigns, venues, advertisers, activeSlotRevenue, openSlotOpportunity, mrr: activeSlotRevenue };
}

function metricCard(label, value, note = "") { return `<article class="admin-card status-card"><span>${label}</span><h2>${value}</h2><p>${note}</p></article>`; }

function renderNetworkDashboardExtras() {
  const events = ensureArray(STORAGE_KEYS.analyticsEvents);
  const { venues, advertisers, activeSlotRevenue } = revenueSummary();
  const activeVenues = venues.filter((venue) => venue.status === "active").length;
  const activeAdvertisers = advertisers.filter((adv) => adv.status === "active").length;
  const container = document.querySelector("#analytics-grid");
  if (container) {
    const counts = (type) => events.filter((event) => event.type === type).length;
    const topVenue = topBy(events.map((event) => event.venueSlug).filter(Boolean)) || "No scans yet";
    const topSlot = topBy(events.map((event) => event.adSlot).filter(Boolean)) || "No clicks yet";
    container.innerHTML = [
      metricCard("Total scans", counts("qr_scan")), metricCard("Issue views", counts("issue_view")), metricCard("Ad clicks", counts("ad_click")), metricCard("Coupon clicks", counts("coupon_click")), metricCard("Top venue", topVenue), metricCard("Top ad slot", topSlot), metricCard("Estimated revenue", `$${activeSlotRevenue}/mo`), metricCard("Active advertisers", activeAdvertisers), metricCard("Active venues", activeVenues)
    ].join("");
  }
}

function topBy(values) {
  const counts = values.reduce((map, value) => ({ ...map, [value]: (map[value] || 0) + 1 }), {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
}

function renderVenues() {
  const venues = ensureArray(STORAGE_KEYS.venues);
  document.querySelectorAll("#qr-venue-select, #issue-venue-select").forEach((select) => { if (select) select.innerHTML = venues.map((venue) => `<option value="${venue.id}">${venue.name}</option>`).join(""); });
  const list = document.querySelector("#venues-list");
  if (list) list.innerHTML = venues.map((venue) => `<article class="network-row"><strong>${venue.name}</strong><span>${venue.businessType} • ${venue.city}, ${venue.state} • ${venue.status}</span><small>${venue.contactName || "No contact"} ${venue.contactEmail || ""}</small><a href="../index.html?venue=${venue.slug}&qr=mens-stall-1" target="_blank">Preview venue</a></article>`).join("");
}

function qrCanvas(id, url) {
  requestAnimationFrame(() => {
    const target = document.getElementById(id);
    if (!target) return;
    if (window.QRCode?.toCanvas) window.QRCode.toCanvas(target, url, { width: 112, margin: 1 });
    else target.replaceWith(Object.assign(document.createElement("a"), { href: url, textContent: "Open QR URL" }));
  });
}

function renderQrLocations() {
  const venues = ensureArray(STORAGE_KEYS.venues);
  const qrs = ensureArray(STORAGE_KEYS.qrLocations);
  const list = document.querySelector("#qr-list");
  if (!list) return;
  list.innerHTML = qrs.map((qr, index) => {
    const venue = venues.find((item) => item.id === qr.venueId) || {};
    const url = qr.targetUrl || `/?venue=${venue.slug}&qr=${qr.qrId}`;
    const absolute = `${location.origin}${location.pathname.replace(/admin\/?$/, "")}${url}`;
    const canvasId = `qr-canvas-${index}`;
    setTimeout(() => qrCanvas(canvasId, absolute), 0);
    return `<article class="network-row qr-row"><canvas id="${canvasId}" width="112" height="112"></canvas><div><strong>${qr.locationName}</strong><span>${venue.name || qr.venueId} • ${qr.placementType} • ${qr.active ? "active" : "paused"}</span><small>${url} • scans: ${qr.scanCount || 0}</small></div></article>`;
  }).join("");
}

function renderIssues() {
  const issues = ensureArray(STORAGE_KEYS.issues);
  const venues = ensureArray(STORAGE_KEYS.venues);
  const list = document.querySelector("#issues-list");
  if (list) list.innerHTML = issues.map((issue) => { const venue = venues.find((v) => v.id === issue.venueId) || {}; return `<article class="network-row"><strong>${issue.title}</strong><span>${issue.month} ${issue.year} • ${issue.city} • ${issue.status}</span><small>Slots ${issue.assignedAdSlots?.join(", ") || "none"}</small><a href="../index.html?venue=${venue.slug || "mgm-grand-las-vegas"}&previewIssue=${issue.id}" target="_blank">Preview issue by venue</a></article>`; }).join("");
}

function renderInventory() {
  const campaigns = ensureArray(STORAGE_KEYS.campaigns);
  const grid = document.querySelector("#inventory-grid");
  if (!grid) return;
  grid.innerHTML = getNetworkAdSlots().map((slot) => {
    const campaign = campaigns.find((item) => item.id === (slot.campaignId || slot.campaignAssigned));
    return `<article class="inventory-card"><span>Slot ${slot.slotNumber}</span><h3>${slot.placementName}</h3><p>${slot.size} • $${slot.price}/month</p><strong>${campaign?.advertiserName || slot.advertiserAssigned || "Open"}</strong><small>${slot.availability || (campaign ? "sold" : "open")} • ${slot.startDate || ""} ${slot.endDate ? `→ ${slot.endDate}` : ""}</small></article>`;
  }).join("");
}

function renderAdvertisers() {
  const select = document.querySelector("#campaign-advertiser-select");
  const advertisers = ensureArray(STORAGE_KEYS.advertisers);
  if (select) select.innerHTML = advertisers.map((adv) => `<option value="${adv.id}">${adv.businessName}</option>`).join("");
  const list = document.querySelector("#advertisers-list");
  if (list) list.innerHTML = advertisers.map((adv) => `<article class="network-row"><strong>${adv.businessName}</strong><span>${adv.category} • ${adv.status} • $${adv.monthlySpend || 0}/mo</span><small>${adv.contactName || ""} ${adv.email || ""} ${adv.phone || ""}</small></article>`).join("");
}

function renderCampaigns() {
  const list = document.querySelector("#campaigns-list");
  if (list) list.innerHTML = ensureArray(STORAGE_KEYS.campaigns).map((campaign) => `<article class="network-row"><strong>${campaign.advertiserName || campaign.businessName}</strong><span>${campaign.offer} • ${campaign.status}</span><small>Coupon ${campaign.couponCode || "—"} • Slots ${(campaign.selectedSlots || []).join(", ") || "none"}</small></article>`).join("");
}

function renderRevenue() {
  const { slots, venues, advertisers, activeSlotRevenue, openSlotOpportunity, mrr } = revenueSummary();
  const grid = document.querySelector("#revenue-grid");
  if (grid) grid.innerHTML = [metricCard("Monthly recurring revenue", `$${mrr}`), metricCard("Active slot revenue", `$${activeSlotRevenue}`), metricCard("Open slot opportunity", `$${openSlotOpportunity}`), metricCard("Active venues", venues.filter((v) => v.status === "active").length), metricCard("Active advertisers", advertisers.filter((a) => a.status === "active").length)].join("");
  const breakdown = document.querySelector("#revenue-breakdown");
  if (breakdown) breakdown.innerHTML = venues.map((venue) => `<article class="network-row"><strong>${venue.name}</strong><span>Estimated venue ad revenue: $${activeSlotRevenue}/mo</span><small>Distributor placeholder commission at 20%: $${Math.round(activeSlotRevenue * 0.2)}/mo</small></article>`).join("");
}

function renderDistributors() {
  const { activeSlotRevenue } = revenueSummary();
  const venues = ensureArray(STORAGE_KEYS.venues);
  const list = document.querySelector("#distributors-list");
  if (list) list.innerHTML = ensureArray(STORAGE_KEYS.distributors).map((dist) => `<article class="network-row"><strong>${dist.name}</strong><span>${dist.city}, ${dist.state} • ${(dist.commissionRate || 0.2) * 100}% commission</span><small>${dist.email} • assigned venues: ${(dist.assignedVenues || []).map((id) => venues.find((v) => v.id === id)?.name || id).join(", ")}</small><b>Commission placeholder: $${Math.round(activeSlotRevenue * (dist.commissionRate || 0.2))}/mo</b></article>`).join("");
}

function refreshPhase3() {
  renderVenues(); renderQrLocations(); renderIssues(); renderInventory(); renderAdvertisers(); renderCampaigns(); renderNetworkDashboardExtras(); renderRevenue(); renderDistributors();
}

function networkFormObject(formSelector) { return Object.fromEntries(new FormData(document.querySelector(formSelector)).entries()); }

function saveVenueRecord() {
  const form = networkFormObject("#venue-form");
  const name = safeText(form.name, "New Venue");
  const record = { id: `venue-${slugify(form.slug || name)}`, ...form, name, slug: slugify(form.slug || name) };
  const venues = ensureArray(STORAGE_KEYS.venues).filter((venue) => venue.id !== record.id);
  saveJson(STORAGE_KEYS.venues, [...venues, record]); refreshPhase3();
}

function saveQrRecord() {
  const form = networkFormObject("#qr-form");
  const venues = ensureArray(STORAGE_KEYS.venues); const venue = venues.find((v) => v.id === form.venueId) || venues[0] || {};
  const qrId = slugify(form.qrId || form.locationName || "qr-location");
  const record = { ...form, qrId, active: form.active === "true", targetUrl: `/?venue=${venue.slug}&qr=${qrId}`, scanCount: 0 };
  const qrs = ensureArray(STORAGE_KEYS.qrLocations).filter((qr) => !(qr.venueId === record.venueId && qr.qrId === record.qrId));
  saveJson(STORAGE_KEYS.qrLocations, [...qrs, record]); refreshPhase3();
}

function saveIssueRecord() {
  const form = networkFormObject("#issue-form");
  const venue = ensureArray(STORAGE_KEYS.venues).find((v) => v.id === form.venueId) || {};
  const record = { id: `issue-${slugify(form.title || `${venue.slug}-${Date.now()}`)}`, ...form, venueName: venue.name, contentBlocks: safeText(form.contentBlocks).split(/\n+/).filter(Boolean), assignedAdSlots: safeText(form.assignedSlots, "1,2,3,4,5,6,7,8").split(/\s*,\s*/).filter(Boolean), publishedAt: form.status === "published" ? createdAt() : "" };
  saveJson(STORAGE_KEYS.issues, [...ensureArray(STORAGE_KEYS.issues).filter((issue) => issue.id !== record.id), record]); refreshPhase3();
}

function duplicatePreviousIssue() {
  const issues = ensureArray(STORAGE_KEYS.issues); const previous = issues[0]; if (!previous) return;
  const copy = { ...previous, id: `${previous.id}-copy-${Date.now()}`, title: `${previous.title} Copy`, status: "draft", duplicatedFrom: previous.id };
  saveJson(STORAGE_KEYS.issues, [copy, ...issues]); refreshPhase3();
}

function saveAdvertiserRecord() {
  const form = networkFormObject("#advertiser-form"); const businessName = safeText(form.businessName, "New Advertiser");
  const record = { id: `adv-${slugify(businessName)}`, ...form, businessName, assignedVenues: [], assignedCampaigns: [], monthlySpend: Number(form.monthlySpend || 0) };
  saveJson(STORAGE_KEYS.advertisers, [...ensureArray(STORAGE_KEYS.advertisers).filter((adv) => adv.id !== record.id), record]); refreshPhase3();
}

function saveNetworkCampaignRecord() {
  const form = networkFormObject("#campaign-form"); const adv = ensureArray(STORAGE_KEYS.advertisers).find((item) => item.id === form.advertiserId) || {};
  const selectedSlots = safeText(form.selectedSlots, "1").split(/\s*,\s*/).filter(Boolean);
  const selectedVenues = safeText(form.selectedVenues, "all") === "all" ? ensureArray(STORAGE_KEYS.venues).map((v) => v.id) : safeText(form.selectedVenues).split(/\s*,\s*/).filter(Boolean);
  const record = { id: `camp-${slugify(adv.businessName || form.offer)}-${Date.now()}`, ...form, advertiserName: adv.businessName, businessName: adv.businessName, selectedSlots, selectedVenues, creativeImages: safeText(form.creativeImages).split(/\n+/).filter(Boolean), createdAt: createdAt(), adMode: "html", headline: `${adv.businessName || "Sponsor"}: ${form.offer}`, subheadline: "Published from Campaign Manager", ctaText: "Claim offer" };
  const campaigns = [...ensureArray(STORAGE_KEYS.campaigns), record]; saveJson(STORAGE_KEYS.campaigns, campaigns);
  const slots = getNetworkAdSlots().map((slot) => selectedSlots.includes(String(slot.slotNumber)) ? { ...slot, availability: "sold", advertiserAssigned: record.advertiserName, campaignAssigned: record.id, campaignId: record.id, advertiserId: record.advertiserId, venueIds: selectedVenues, startDate: record.startDate, endDate: record.endDate } : slot);
  setNetworkAdSlots(slots); refreshPhase3();
}

function pauseSelectedCampaign() {
  const advId = document.querySelector("#campaign-advertiser-select")?.value;
  saveJson(STORAGE_KEYS.campaigns, ensureArray(STORAGE_KEYS.campaigns).map((campaign) => campaign.advertiserId === advId ? { ...campaign, status: "draft" } : campaign)); refreshPhase3();
}

function upsertCampaignFromCreative(ad) {
  if (!ad?.businessName) return;
  const advertisers = ensureArray(STORAGE_KEYS.advertisers);
  let adv = advertisers.find((item) => item.businessName === ad.businessName);
  if (!adv) { adv = { id: `adv-${slugify(ad.businessName)}`, businessName: ad.businessName, category: ad.category || ad.businessCategory || "Generated creative", contactName: "", email: "", phone: ad.phone || "", website: ad.website || "", status: "lead", notes: "Created from AI Creative Studio", assignedVenues: [], assignedCampaigns: [], monthlySpend: 0 }; saveJson(STORAGE_KEYS.advertisers, [...advertisers, adv]); }
  const existingCampaigns = ensureArray(STORAGE_KEYS.campaigns).filter((campaign) => !(campaign.businessName === ad.businessName && String(campaign.slotPublishedTo || "") === String(ad.slotPublishedTo || "")));
  const campaign = { id: `camp-${slugify(ad.businessName)}-${Date.now()}`, advertiserId: adv.id, advertiserName: adv.businessName, businessName: adv.businessName, offer: ad.offer, couponCode: ad.couponCode, startDate: new Date().toISOString().slice(0, 10), endDate: ad.expiration || "", selectedVenues: ensureArray(STORAGE_KEYS.venues).map((v) => v.id), selectedSlots: ad.slotPublishedTo ? [String(ad.slotPublishedTo)] : [], creativeImages: [ad.imageAdUrl || ad.imageUrl || ""].filter(Boolean), status: ad.slotPublishedTo ? "active" : "draft", ...ad };
  saveJson(STORAGE_KEYS.campaigns, [campaign, ...existingCampaigns]);
  return campaign;
}

function exportAllData() {
  const keys = [STORAGE_KEYS.settings, STORAGE_KEYS.venues, STORAGE_KEYS.qrLocations, STORAGE_KEYS.issues, STORAGE_KEYS.advertisers, STORAGE_KEYS.campaigns, STORAGE_KEYS.ads, STORAGE_KEYS.analyticsEvents, STORAGE_KEYS.distributors, STORAGE_KEYS.campaignHistory, STORAGE_KEYS.published, STORAGE_KEYS.draft];
  const payload = Object.fromEntries(keys.map((key) => [key, readJson(key, null)]));
  const json = JSON.stringify(payload, null, 2);
  document.querySelector("#data-export-output").value = json;
  const blob = new Blob([json], { type: "application/json" });
  const link = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `stalltalk-phase3-export-${Date.now()}.json` });
  link.click(); URL.revokeObjectURL(link.href);
}

function importAllData(file) {
  if (!file) return;
  const allowedKeys = new Set([STORAGE_KEYS.settings, STORAGE_KEYS.venues, STORAGE_KEYS.qrLocations, STORAGE_KEYS.issues, STORAGE_KEYS.advertisers, STORAGE_KEYS.campaigns, STORAGE_KEYS.ads, STORAGE_KEYS.analyticsEvents, STORAGE_KEYS.distributors, STORAGE_KEYS.campaignHistory, STORAGE_KEYS.published, STORAGE_KEYS.draft]);
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(String(reader.result || "{}"));
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Export file must be a JSON object keyed by Stall Talk storage keys.");
      Object.entries(payload).forEach(([key, value]) => { if (allowedKeys.has(key)) saveJson(key, value); });
      document.querySelector("#data-status").textContent = "Imported Phase 3 network data.";
      refreshAdmin(); refreshPhase3();
    } catch (error) {
      document.querySelector("#data-status").textContent = `Import failed: ${error.message}. Choose a valid Stall Talk JSON export.`;
    }
  };
  reader.onerror = () => { document.querySelector("#data-status").textContent = "Import failed: the selected file could not be read."; };
  reader.readAsText(file);
}

function wirePhase3() {
  seedDemoNetwork(false); refreshPhase3();
  document.querySelector("#save-venue")?.addEventListener("click", saveVenueRecord);
  document.querySelector("#save-qr")?.addEventListener("click", saveQrRecord);
  document.querySelector("#save-issue")?.addEventListener("click", saveIssueRecord);
  document.querySelector("#duplicate-issue")?.addEventListener("click", duplicatePreviousIssue);
  document.querySelector("#save-advertiser")?.addEventListener("click", saveAdvertiserRecord);
  document.querySelector("#save-network-campaign")?.addEventListener("click", saveNetworkCampaignRecord);
  document.querySelector("#pause-campaign")?.addEventListener("click", pauseSelectedCampaign);
  document.querySelector("#export-all-data")?.addEventListener("click", exportAllData);
  document.querySelector("#import-all-data")?.addEventListener("change", (event) => importAllData(event.target.files?.[0]));
  document.querySelector("#reset-demo-network")?.addEventListener("click", () => { seedDemoNetwork(true); document.querySelector("#data-status").textContent = "Demo network reset."; refreshAdmin(); refreshPhase3(); });
}


async function testOpenAiConnection() {
  const status = document.querySelector("#openai-test-status");
  const adStatus = document.querySelector("#ad-status");
  const setStatus = (message) => {
    if (status) status.textContent = message;
    if (adStatus) adStatus.textContent = message;
  };
  setStatus("Testing AI endpoint system health…");
  try {
    const endpoint = aiEndpointUrl("/api/system-health?runImageTest=1");
    if (!endpoint) {
      setStatus("AI Image API Endpoint is not configured. Paste your Vercel base URL in Settings first.");
      setApiEndpointStatus("Endpoint test could not run because no Vercel URL is configured.");
      return;
    }
    const response = await fetch(endpoint, { cache: "no-store" });
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok) throw new Error(`System health failed with HTTP ${response.status} ${response.statusText || ""}`.trim());
    if (!contentType.includes("application/json")) throw new Error("The AI endpoint returned HTML instead of JSON. Check that your Vercel URL is configured.");
    let data = null;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new Error("The AI endpoint returned invalid JSON. Check that your Vercel URL is configured.");
    }
    setApiEndpointStatus("System health responded with JSON.");
    const openAi = data.openAi || {};
    setStatus([
      `API key detected: ${Boolean(openAi.apiKeyDetected)}`,
      `Model detected: ${openAi.model || "unknown"}`,
      `Successful image generation test: ${openAi.imageGenerationTest === "successful" ? "yes" : "no"}`,
      `OpenAI status: ${openAi.status || "Failed"}`,
      openAi.error ? `Exact error: ${openAi.error}` : ""
    ].filter(Boolean).join(" • "));
  } catch (error) {
    setStatus(`AI endpoint test failed: ${error.message}`);
    setApiEndpointStatus("Endpoint test failed.");
  }
}

function init() {
  setContentValues(readJson(STORAGE_KEYS.draft, readJson(STORAGE_KEYS.published, DEMO_CONTENT)));
  loadSettingsForm();
  setApiEndpointStatus();
  generateCopy();
  refreshAdmin();
  wirePhase3();

  document.querySelectorAll(".tab-button").forEach((button) => button.addEventListener("click", () => switchTab(button.dataset.tab)));
  document.querySelectorAll("[data-go-tab]").forEach((button) => button.addEventListener("click", () => switchTab(button.dataset.goTab)));
  document.querySelector("#ai-generate-content").addEventListener("click", generateContent);
  document.querySelector("#save-draft").addEventListener("click", saveDraft);
  document.querySelector("#publish-content").addEventListener("click", publishContent);
  document.querySelector("#dashboard-publish").addEventListener("click", publishContent);
  document.querySelector("#reset-demo").addEventListener("click", resetDemoContent);
  document.querySelector("#generate-copy").addEventListener("click", generateCopy);
  document.querySelector("#generate-ad").addEventListener("click", generateGraphicAd);
  document.querySelector("#regenerate-ad").addEventListener("click", generateGraphicAd);
  document.querySelector("#save-campaign").addEventListener("click", () => saveCampaign(activeAd));
  document.querySelector("#apply-slot").addEventListener("click", applySlot);
  document.querySelector("#clear-slot").addEventListener("click", clearSlot);
  document.querySelector("#save-settings").addEventListener("click", saveSettings);
  document.querySelector("#test-openai")?.addEventListener("click", testOpenAiConnection);
  document.querySelector("#test-ai-endpoint")?.addEventListener("click", testOpenAiConnection);
  document.querySelector('#settings-form [name="apiBaseUrl"]')?.addEventListener("input", (event) => {
    const previous = localStorage.getItem(STORAGE_KEYS.apiBaseUrl);
    const next = normalizeApiBaseUrl(event.target.value);
    if (next) localStorage.setItem(STORAGE_KEYS.apiBaseUrl, next);
    else if (previous) localStorage.removeItem(STORAGE_KEYS.apiBaseUrl);
    setApiEndpointStatus(next ? "Endpoint preview updated in this browser. Click Save Settings after confirming it." : "Endpoint cleared in this browser.");
  });
  document.querySelectorAll("[data-publish-slot]").forEach((button) => button.addEventListener("click", () => publishToSlot(button.dataset.publishSlot)));
  document.querySelectorAll("#preview-headline, #preview-subheadline, #preview-cta, #preview-coupon").forEach((field) => {
    field.addEventListener("input", () => {
      applyEditableCopyToActiveAd();
      if (activeAd) renderAdPreview(activeAd);
    });
  });
}

init();
