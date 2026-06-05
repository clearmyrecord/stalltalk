const STORAGE_KEYS = {
  draft: "stalltalk_content_draft",
  published: "stalltalk_content_published",
  ads: window.StallTalkGraphicAds?.storageKey || "stalltalk_ad_slots",
  campaigns: "stalltalk_campaign_history",
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
let isGeneratingGraphic = false;

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

function createdAt() {
  return new Date().toISOString();
}

function safeText(value, fallback = "") {
  return String(value || "").trim() || fallback;
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

function getCampaignHistory() {
  return readJson(STORAGE_KEYS.campaigns, []);
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
    headline: `${businessName}: ${offer}`,
    subheadline: `A ${tone.toLowerCase()} offer built for ${audience}.`,
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
  saveJson(STORAGE_KEYS.campaigns, next);
  renderCampaignHistory();
  document.querySelector("#ad-status").textContent = `Saved ${ad.businessName} to campaign history.`;
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
  document.querySelector("#ad-status").textContent = "Generating finished graphic ad with the Vercel AI endpoint…";

  try {
    const response = await fetch(window.STALLTALK_AD_IMAGE_ENDPOINT || "/api/generate-ad-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draftAd),
    });
    const data = await response.json();

    if (!response.ok) {
      const diagnostic = data?.diagnostic || {};
      const details = [data?.error || "AI image generation failed.", diagnostic.apiStatus ? `API: ${diagnostic.apiStatus}` : "", diagnostic.openAiStatus ? `OpenAI: ${diagnostic.openAiStatus}` : "", diagnostic.model ? `Model: ${diagnostic.model}` : "", diagnostic.errorType ? `Type: ${diagnostic.errorType}` : "", diagnostic.openAiStatusCode ? `HTTP: ${diagnostic.openAiStatusCode}` : ""].filter(Boolean).join(" • ");
      throw new Error(details);
    }

    const imageUrl = safeText(data.imageUrl);
    const imageBase64 = safeText(data.imageBase64);
    activeAd = {
      ...draftAd,
      adMode: imageUrl || imageBase64 ? "image" : "pending",
      imageAdUrl: imageUrl,
      imageAdBase64: imageBase64,
      promptUsed: safeText(data.promptUsed || data.prompt),
      headline: safeText(data.headline, draftAd.headline),
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
  const slots = getAdSlots();
  const publishedAd = { ...activeAd, slotPublishedTo: String(slotNumber), savedAt: timestamp() };
  slots[String(slotNumber)] = publishedAd;
  saveJson(STORAGE_KEYS.ads, slots);
  saveCampaign(publishedAd);
  document.querySelector("#ad-status").textContent = `Published ${publishedAd.businessName} to Ad Slot ${slotNumber}.`;
  refreshAdmin();
}

function applySlot() {
  publishToSlot(document.querySelector("#slot-select").value);
}

function clearSlot() {
  const slotNumber = document.querySelector("#slot-select").value;
  const slots = getAdSlots();
  delete slots[slotNumber];
  saveJson(STORAGE_KEYS.ads, slots);
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
  const settings = { ...DEFAULT_SETTINGS, ...Object.fromEntries(formData.entries()), savedAt: timestamp() };
  saveJson(STORAGE_KEYS.settings, settings);
  // Future backend/database publishing will persist issue metadata with the published issue record.
  document.querySelector("#settings-status").textContent = "Settings saved. Public issue branding updated in this browser.";
  refreshAdmin();
}

async function testOpenAiConnection() {
  const status = document.querySelector("#openai-test-status");
  status.textContent = "Testing OpenAI image generation…";
  try {
    const response = await fetch("/api/system-health?runImageTest=1", { cache: "no-store" });
    const data = await response.json();
    const openAi = data.openAi || {};
    status.textContent = [
      `API key detected: ${Boolean(openAi.apiKeyDetected)}`,
      `Model detected: ${openAi.model || "unknown"}`,
      `Successful image generation test: ${openAi.imageGenerationTest === "successful" ? "yes" : "no"}`,
      `OpenAI status: ${openAi.status || "Failed"}`,
      openAi.error ? `Exact error: ${openAi.error}` : ""
    ].filter(Boolean).join(" • ");
  } catch (error) {
    status.textContent = `OpenAI connection test failed: ${error.message}`;
  }
}

function init() {
  setContentValues(readJson(STORAGE_KEYS.draft, readJson(STORAGE_KEYS.published, DEMO_CONTENT)));
  loadSettingsForm();
  generateCopy();
  refreshAdmin();

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
  document.querySelectorAll("[data-publish-slot]").forEach((button) => button.addEventListener("click", () => publishToSlot(button.dataset.publishSlot)));
  document.querySelectorAll("#preview-headline, #preview-subheadline, #preview-cta, #preview-coupon").forEach((field) => {
    field.addEventListener("input", () => {
      applyEditableCopyToActiveAd();
      if (activeAd) renderAdPreview(activeAd);
    });
  });
}

init();
