const STORAGE_KEYS = {
  issue: "pottyfavor_issue",
  draft: "pottyfavor_issue_draft",
  venues: "pottyfavor_venues",
  ads: "pottyfavor_ads",
  settings: "pottyfavor_settings",
  analytics: "pottyfavor_analytics",
  oldIssue: "stalltalk_standard_issue",
  oldAds: "stalltalk_ad_slots",
  oldVenues: "stalltalk_venues",
};

const DEMO = {
  issue: {
    issueMonthYear: "June 2026",
    mastheadBrand: "Potty Favor",
    missionText: "To inspire, inform, educate, and entertain humanity — all from the comfort of your very own stall.",
    humorTitle: "Hilariously Funny",
    humorBody: "A couple of New Jersey hunters are out in the woods when one of them falls to the ground. His friend calls 911. The operator calmly says, ‘First, make sure he is dead.’ There is silence, then a shot. The guy returns and says, ‘Okay, now what?’",
    mainFeatureTitle: "How It All Started",
    mainFeatureBody: "The product you are seeing for the first time was first conceived eleven years ago. Before that, the idea was only a piece of paper, a criminal record, and a promise that something useful could be created from a difficult season.\n\nAfter being in more than 300 cities over the past decade, one lesson keeps showing up: the pursuit of love and righteousness yields life, prosperity, and honor.",
    secondaryFeatureTitle: "The History of Box Chairs",
    secondaryFeatureBody: "The box chair was originally invented by Billy Bryant, a US Air Force Special Forces veteran. After leaving the service, Billy studied mechanical design and went to work for a cardboard factory. One day, he built a cardboard box into a practical chair that could support more than 300 pounds.",
    wordOfTheDay: "transmute",
    wordDefinition: "verb — to change from one nature or form into another.",
    quotes: ["Great minds discuss ideas; average minds discuss events; small minds discuss people. — Eleanor Roosevelt", "Success is not final, failure is not fatal: it is the courage to continue that counts. — Winston Churchill", "If you can imagine it, you can create it. If you dream it, you can become it. — William Ward"],
    didYouKnow: ["Rice paper contains no rice grain or rice.", "French fries originated in Belgium.", "Mountain goats are small antelopes.", "The funny bone is a nerve, not a bone."],
    noWay: ["The most impossible item to flush is a ping pong ball.", "Separate cubicles for toilets are a relatively modern invention.", "Before toilet paper, people used shells, stones, herbs, or sponge attached to a stick."],
    calendarText: "Outdoor Events Association: register your event free and discover local happenings all month.",
  },
  venues: [
    { name: "MGM Grand Restroom", city: "Las Vegas", state: "NV", slug: "mgm-grand" },
    { name: "Box Chairs Demo Venue", city: "Knoxville", state: "TN", slug: "box-chairs-demo" },
  ],
  ads: [
    { slot: 1, advertiserName: "United Painters Worldwide", headline: "Fresh Coat Special", offer: "Emergency management and commercial painting quotes.", couponCode: "PAINT10", cta: "Request Quote", targetUrl: "https://example.com/painters", image: "", targetingType: "global", market: "", active: true },
    { slot: 2, advertiserName: "Outdoor Events Association", headline: "List Your Event", offer: "Register your event and reach mobile readers.", couponCode: "EVENT", cta: "Register Free", targetUrl: "https://example.com/events", image: "", targetingType: "global", market: "", active: true },
    { slot: 3, advertiserName: "Box Chairs", headline: "Made From Recycled Materials", offer: "100% customizable event seating.", couponCode: "BOX", cta: "Advertise With Us", targetUrl: "https://example.com/boxchairs", image: "", targetingType: "global", market: "", active: true },
    { slot: 4, advertiserName: "Potty Favor Ads", headline: "A Captive Audience", offer: "Indoor ads viewed for an average of 1.5 to 2 minutes.", couponCode: "STALL", cta: "Reserve Slot", targetUrl: "https://example.com/ads", image: "", targetingType: "global", market: "", active: true },
    { slot: 5, advertiserName: "Neon Bites", headline: "Vegas Late Night", offer: "10% off tacos after 9 PM.", couponCode: "VEGAS10", cta: "Claim Deal", targetUrl: "https://example.com/neon", image: "", targetingType: "city", market: "Las Vegas", active: true },
    { slot: 6, advertiserName: "MGM Coffee Cart", headline: "Scan & Sip", offer: "Free size upgrade for QR readers.", couponCode: "MGMJAVA", cta: "Get Coupon", targetUrl: "https://example.com/coffee", image: "", targetingType: "venue", market: "mgm-grand", active: true },
    { slot: 7, advertiserName: "Tennessee Tech Night", headline: "Knoxville Meetup", offer: "Free local founder mixer ticket.", couponCode: "KNOX", cta: "RSVP", targetUrl: "https://example.com/knox", image: "", targetingType: "state", market: "TN", active: true },
    { slot: 8, advertiserName: "Your Business Here", headline: "Advertise With Us", offer: "Reach readers where phones are already in hand.", couponCode: "", cta: "Book Slot", targetUrl: "https://example.com/sponsor", image: "", targetingType: "global", market: "", active: true },
    { slot: 5, advertiserName: "Clean Break Coffee", headline: "Reader Coffee Perk", offer: "15% off your first online order.", couponCode: "BREAK15", cta: "Order Now", targetUrl: "https://example.com/coffee-global", image: "", targetingType: "global", market: "", active: true },
    { slot: 6, advertiserName: "Freshen Up Travel Kit", headline: "Restroom Ready", offer: "Travel-size essentials bundle for readers.", couponCode: "FRESH", cta: "Shop Kit", targetUrl: "https://example.com/fresh", image: "", targetingType: "global", market: "", active: true },
    { slot: 7, advertiserName: "Two-Minute Trivia", headline: "Play & Win", offer: "Play a quick trivia round for weekly rewards.", couponCode: "TRIVIA", cta: "Play Now", targetUrl: "https://example.com/trivia", image: "", targetingType: "global", market: "", active: true },
  ],
  settings: { qrBaseUrl: "https://clearmyrecord.github.io/stalltalk/index.html" },
};

let activeSlot = 1;

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn(`Could not parse ${key}`, error);
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function slugify(value) {
  return String(value || "").trim().toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function linesToArray(value) {
  return String(value || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
}

function arrayToLines(value) {
  return Array.isArray(value) ? value.join("\n") : String(value || "");
}

function state() {
  return {
    issue: { ...DEMO.issue, ...readJson(STORAGE_KEYS.issue, readJson(STORAGE_KEYS.draft, {})) },
    venues: readJson(STORAGE_KEYS.venues, DEMO.venues),
    ads: readJson(STORAGE_KEYS.ads, DEMO.ads),
    settings: { ...DEMO.settings, ...readJson(STORAGE_KEYS.settings, {}) },
    analytics: readJson(STORAGE_KEYS.analytics, []),
  };
}

function migrateOldKeys() {
  if (!localStorage.getItem(STORAGE_KEYS.issue)) {
    const oldIssue = readJson(STORAGE_KEYS.oldIssue, null);
    if (oldIssue && typeof oldIssue === "object") saveJson(STORAGE_KEYS.issue, oldIssue.issue || oldIssue.content || oldIssue);
  }
  if (!localStorage.getItem(STORAGE_KEYS.venues)) {
    const oldVenues = readJson(STORAGE_KEYS.oldVenues, null);
    if (Array.isArray(oldVenues)) saveJson(STORAGE_KEYS.venues, oldVenues);
  }
  if (!localStorage.getItem(STORAGE_KEYS.ads)) {
    const oldAds = readJson(STORAGE_KEYS.oldAds, null);
    if (Array.isArray(oldAds)) saveJson(STORAGE_KEYS.ads, oldAds);
  }
}

function setStatus(message) {
  const status = document.querySelector("#content-status");
  if (status) status.textContent = message;
}

function collectIssue() {
  const form = document.querySelector("#content-form");
  const data = new FormData(form);
  return {
    issueMonthYear: String(data.get("issueMonthYear") || ""),
    mastheadBrand: String(data.get("mastheadBrand") || ""),
    missionText: String(data.get("missionText") || ""),
    humorTitle: String(data.get("humorTitle") || ""),
    humorBody: String(data.get("humorBody") || ""),
    mainFeatureTitle: String(data.get("mainFeatureTitle") || ""),
    mainFeatureBody: String(data.get("mainFeatureBody") || ""),
    secondaryFeatureTitle: String(data.get("secondaryFeatureTitle") || ""),
    secondaryFeatureBody: String(data.get("secondaryFeatureBody") || ""),
    wordOfTheDay: String(data.get("wordOfTheDay") || ""),
    wordDefinition: String(data.get("wordDefinition") || ""),
    quotes: linesToArray(data.get("quotes")),
    didYouKnow: linesToArray(data.get("didYouKnow")),
    noWay: linesToArray(data.get("noWay")),
    calendarText: String(data.get("calendarText") || ""),
  };
}

function fillIssueForm(issue) {
  const form = document.querySelector("#content-form");
  Object.entries(issue).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = Array.isArray(value) ? arrayToLines(value) : value;
  });
}

function qrUrlForSlug(slug) {
  const settings = state().settings;
  const base = settings.qrBaseUrl || DEMO.settings.qrBaseUrl;
  return `${base}?venue=${encodeURIComponent(slug)}`;
}

function drawQr(canvas, text) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const size = canvas.width;
  const cells = 29;
  const cell = size / cells;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size, size);
  function finder(x, y) {
    ctx.fillStyle = "#000";
    ctx.fillRect(x * cell, y * cell, 7 * cell, 7 * cell);
    ctx.fillStyle = "#fff";
    ctx.fillRect((x + 1) * cell, (y + 1) * cell, 5 * cell, 5 * cell);
    ctx.fillStyle = "#000";
    ctx.fillRect((x + 2) * cell, (y + 2) * cell, 3 * cell, 3 * cell);
  }
  finder(1, 1); finder(21, 1); finder(1, 21);
  let seed = 0;
  for (const char of text) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  for (let y = 0; y < cells; y += 1) {
    for (let x = 0; x < cells; x += 1) {
      const inFinder = (x < 9 && y < 9) || (x > 19 && y < 9) || (x < 9 && y > 19);
      if (inFinder) continue;
      seed = (seed * 1664525 + 1013904223) >>> 0;
      if (seed % 4 === 0) ctx.fillRect(x * cell, y * cell, Math.ceil(cell), Math.ceil(cell));
    }
  }
}

function updateQrPreview(slug) {
  const finalSlug = slugify(slug || document.querySelector('#venue-form [name="slug"]').value || "demo-venue");
  const url = qrUrlForSlug(finalSlug);
  document.querySelector("#qr-url").textContent = url;
  drawQr(document.querySelector("#admin-qr"), url);
}

function renderVenues() {
  const list = document.querySelector("#venue-list");
  list.innerHTML = "";
  state().venues.forEach((venue, index) => {
    const card = document.createElement("article");
    card.className = "list-card";
    const url = qrUrlForSlug(venue.slug);
    card.innerHTML = `<div class="row"><strong>${venue.name}</strong><span>${venue.city}, ${venue.state}</span></div><code>${url}</code><div class="actions"><button type="button" data-use-venue="${index}">Preview QR</button><button type="button" class="secondary" data-delete-venue="${index}">Delete</button></div>`;
    list.appendChild(card);
  });
}

function renderSlotPicker() {
  const picker = document.querySelector("#slot-picker");
  picker.innerHTML = "";
  for (let slot = 1; slot <= 8; slot += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `Slot ${slot}`;
    button.classList.toggle("active", slot === activeSlot);
    button.dataset.slot = slot;
    picker.appendChild(button);
  }
}

function activeAd() {
  return state().ads.find((ad) => Number(ad.slot) === Number(activeSlot)) || { slot: activeSlot, advertiserName: "", headline: "", offer: "", couponCode: "", cta: "Learn More", targetUrl: "#", image: "", targetingType: "global", market: "", active: true };
}

function fillAdForm() {
  const ad = activeAd();
  const form = document.querySelector("#ad-form");
  ["advertiserName", "headline", "offer", "couponCode", "cta", "targetUrl", "image", "targetingType", "market", "active"].forEach((key) => {
    if (form.elements[key]) form.elements[key].value = key === "active" ? String(ad.active !== false) : ad[key] || "";
  });
}

function renderAds() {
  renderSlotPicker();
  fillAdForm();
  const list = document.querySelector("#ad-list");
  list.innerHTML = "";
  state().ads.slice().sort((a, b) => Number(a.slot) - Number(b.slot)).forEach((ad) => {
    const card = document.createElement("article");
    card.className = "list-card";
    card.innerHTML = `<div class="row"><strong>Slot ${ad.slot}: ${ad.advertiserName}</strong><span>${ad.active === false ? "inactive" : "active"}</span></div><p>${ad.headline} — ${ad.offer}</p><small>Target: ${ad.targetingType} ${ad.market || "fallback"}</small>`;
    list.appendChild(card);
  });
}

function collectAd() {
  const data = new FormData(document.querySelector("#ad-form"));
  return {
    slot: activeSlot,
    advertiserName: String(data.get("advertiserName") || "Potty Favor Sponsor"),
    headline: String(data.get("headline") || "Sponsor Message"),
    offer: String(data.get("offer") || "Reader-only offer"),
    couponCode: String(data.get("couponCode") || ""),
    cta: String(data.get("cta") || "Learn More"),
    targetUrl: String(data.get("targetUrl") || "#"),
    image: String(data.get("image") || ""),
    targetingType: String(data.get("targetingType") || "global"),
    market: String(data.get("market") || ""),
    active: String(data.get("active")) === "true",
  };
}

function exportPayload() {
  const current = state();
  return { issue: current.issue, venues: current.venues, ads: current.ads, settings: current.settings, exportedAt: new Date().toISOString() };
}

function refreshExportBox() {
  document.querySelector("#json-box").value = JSON.stringify(exportPayload(), null, 2);
}

function importPayload(payload) {
  if (payload.issue) saveJson(STORAGE_KEYS.issue, payload.issue);
  if (Array.isArray(payload.venues)) saveJson(STORAGE_KEYS.venues, payload.venues);
  if (Array.isArray(payload.ads)) saveJson(STORAGE_KEYS.ads, payload.ads);
  if (payload.settings) saveJson(STORAGE_KEYS.settings, payload.settings);
  loadAll();
  setStatus("Imported JSON into localStorage.");
}

function renderAnalytics() {
  const list = document.querySelector("#analytics-list");
  list.innerHTML = "";
  const events = state().analytics.slice(-12).reverse();
  if (!events.length) {
    list.innerHTML = '<article class="list-card">No analytics yet. Open the public issue to record issue_view, qr_scan, and ad_impression events.</article>';
    return;
  }
  events.forEach((event) => {
    const card = document.createElement("article");
    card.className = "list-card";
    card.innerHTML = `<strong>${event.type}</strong><small>${event.at}</small><code>${JSON.stringify(event.details || {})}</code>`;
    list.appendChild(card);
  });
}

function loadSettings() {
  const form = document.querySelector("#settings-form");
  form.elements.qrBaseUrl.value = state().settings.qrBaseUrl || DEMO.settings.qrBaseUrl;
}

function loadAll() {
  const current = state();
  fillIssueForm(current.issue);
  renderVenues();
  renderAds();
  loadSettings();
  renderAnalytics();
  refreshExportBox();
  updateQrPreview(current.venues[0]?.slug || "demo-venue");
  const frame = document.querySelector("#preview-frame");
  if (frame) frame.src = `../index.html?cache=${Date.now()}`;
}

function bindTabs() {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-tab]").forEach((tab) => tab.classList.remove("active"));
      document.querySelectorAll(".admin-panel").forEach((panel) => panel.classList.remove("active"));
      button.classList.add("active");
      document.querySelector(`#tab-${button.dataset.tab}`).classList.add("active");
      if (button.dataset.tab === "preview") document.querySelector("#preview-frame").src = `../index.html?cache=${Date.now()}`;
      if (button.dataset.tab === "import") refreshExportBox();
    });
  });
}

function bindActions() {
  document.querySelector('#venue-form [name="name"]').addEventListener("input", (event) => {
    const slugField = document.querySelector('#venue-form [name="slug"]');
    if (!slugField.dataset.touched) slugField.value = slugify(event.target.value);
    updateQrPreview(slugField.value);
  });
  document.querySelector('#venue-form [name="slug"]').addEventListener("input", (event) => {
    event.target.dataset.touched = "true";
    updateQrPreview(event.target.value);
  });
  document.querySelector("#save-draft").addEventListener("click", () => {
    saveJson(STORAGE_KEYS.draft, collectIssue());
    setStatus("Draft saved locally.");
  });
  document.querySelector("#publish-issue").addEventListener("click", () => {
    saveJson(STORAGE_KEYS.issue, collectIssue());
    setStatus("Published. Public page will use this issue in the same browser.");
    loadAll();
  });
  document.querySelector("#reset-demo").addEventListener("click", () => {
    saveJson(STORAGE_KEYS.issue, DEMO.issue);
    saveJson(STORAGE_KEYS.venues, DEMO.venues);
    saveJson(STORAGE_KEYS.ads, DEMO.ads);
    saveJson(STORAGE_KEYS.settings, DEMO.settings);
    setStatus("Demo restored.");
    loadAll();
  });
  document.querySelector("#export-json").addEventListener("click", () => {
    refreshExportBox();
    navigator.clipboard?.writeText(document.querySelector("#json-box").value);
    setStatus("Export JSON refreshed and copied when clipboard is available.");
  });
  document.querySelector("#import-file").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    importPayload(JSON.parse(await file.text()));
  });
  document.querySelector("#venue-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    const venues = state().venues;
    venues.push({ name: String(data.get("name")), city: String(data.get("city")), state: String(data.get("state")).toUpperCase(), slug: slugify(data.get("slug")) });
    saveJson(STORAGE_KEYS.venues, venues);
    event.target.reset();
    renderVenues();
    updateQrPreview(venues.at(-1).slug);
  });
  document.querySelector("#venue-list").addEventListener("click", (event) => {
    const useButton = event.target.closest("[data-use-venue]");
    const deleteButton = event.target.closest("[data-delete-venue]");
    const venues = state().venues;
    if (useButton) updateQrPreview(venues[Number(useButton.dataset.useVenue)]?.slug);
    if (deleteButton) {
      venues.splice(Number(deleteButton.dataset.deleteVenue), 1);
      saveJson(STORAGE_KEYS.venues, venues);
      renderVenues();
    }
  });
  document.querySelector("#copy-qr").addEventListener("click", () => navigator.clipboard?.writeText(document.querySelector("#qr-url").textContent));
  document.querySelector("#slot-picker").addEventListener("click", (event) => {
    const button = event.target.closest("[data-slot]");
    if (!button) return;
    activeSlot = Number(button.dataset.slot);
    renderAds();
  });
  document.querySelector("#ad-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const ads = state().ads.filter((ad) => Number(ad.slot) !== Number(activeSlot));
    ads.push(collectAd());
    saveJson(STORAGE_KEYS.ads, ads);
    renderAds();
  });
  document.querySelector("#save-settings").addEventListener("click", () => {
    const data = new FormData(document.querySelector("#settings-form"));
    saveJson(STORAGE_KEYS.settings, { qrBaseUrl: String(data.get("qrBaseUrl") || DEMO.settings.qrBaseUrl) });
    updateQrPreview();
  });
  document.querySelector("#refresh-export").addEventListener("click", refreshExportBox);
  document.querySelector("#import-text").addEventListener("click", () => importPayload(JSON.parse(document.querySelector("#json-box").value)));
}

function init() {
  migrateOldKeys();
  if (!localStorage.getItem(STORAGE_KEYS.issue)) saveJson(STORAGE_KEYS.issue, DEMO.issue);
  if (!localStorage.getItem(STORAGE_KEYS.venues)) saveJson(STORAGE_KEYS.venues, DEMO.venues);
  if (!localStorage.getItem(STORAGE_KEYS.ads)) saveJson(STORAGE_KEYS.ads, DEMO.ads);
  if (!localStorage.getItem(STORAGE_KEYS.settings)) saveJson(STORAGE_KEYS.settings, DEMO.settings);
  bindTabs();
  bindActions();
  loadAll();
}

document.addEventListener("DOMContentLoaded", init);
