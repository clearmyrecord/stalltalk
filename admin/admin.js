const STORAGE_KEYS = {
  issue: "pottyfavor_issue",
  draft: "pottyfavor_issue_draft",
  venues: "pottyfavor_venues",
  ads: "pottyfavor_ads",
  settings: "pottyfavor_settings",
  analytics: "pottyfavor_analytics",
  events: "pottyfavor_events",
  pendingEvents: "pottyfavor_pending_events",
  oldEvents: "stalltalk_events",
  oldPendingEvents: "stalltalk_pending_events",
  oldIssue: "stalltalk_standard_issue",
  oldAds: "stalltalk_ad_slots",
  oldVenues: "stalltalk_venues",
  marketAds: "stalltalk_market_ads",
};

const DEMO = {
  issue: {
    issueMonthYear: "June 2026",
    mastheadBrand: "Potty Favor",
    missionText: "Our mission is to inspire, inform, educate, and entertain humanity — all from the comfort of your very own stall.",
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
  events: [
    { id: "demo-rooftop-happy-hour", title: "Rooftop Happy Hour", description: "Sunset drink specials and skyline views for Las Vegas locals and visitors.", venueName: "Neon Sky Lounge", address: "300 Las Vegas Blvd S", city: "Las Vegas", state: "NV", eventDate: "2026-06-12", startTime: "17:00", endTime: "19:00", category: "Nightlife", website: "https://example.com/rooftop", phone: "", submittedByName: "Potty Favor Demo", submittedByEmail: "demo@pottyfavor.com", status: "approved", featured: true, createdAt: "2026-06-01T12:00:00.000Z", updatedAt: "2026-06-01T12:00:00.000Z" },
    { id: "demo-live-music-night", title: "Live Music Night", description: "Local bands take the stage for a reader-friendly night out.", venueName: "Fremont Room", address: "425 Fremont St", city: "Las Vegas", state: "NV", eventDate: "2026-06-18", startTime: "20:00", endTime: "23:00", category: "Concert", website: "https://example.com/live-music", phone: "", submittedByName: "Potty Favor Demo", submittedByEmail: "demo@pottyfavor.com", status: "approved", featured: false, createdAt: "2026-06-01T12:00:00.000Z", updatedAt: "2026-06-01T12:00:00.000Z" },
    { id: "demo-local-comedy-showcase", title: "Local Comedy Showcase", description: "Fast sets from Vegas comedians built for a fun weekend warmup.", venueName: "Arts District Comedy Cellar", address: "1020 S Main St", city: "Las Vegas", state: "NV", eventDate: "2026-06-25", startTime: "19:30", endTime: "21:30", category: "Community", website: "https://example.com/comedy", phone: "", submittedByName: "Potty Favor Demo", submittedByEmail: "demo@pottyfavor.com", status: "approved", featured: false, createdAt: "2026-06-01T12:00:00.000Z", updatedAt: "2026-06-01T12:00:00.000Z" },
  ],
  pendingEvents: [],
  settings: { qrBaseUrl: "https://clearmyrecord.github.io/stalltalk/index.html", vercelApiBaseUrl: "", openAiImageModel: "gpt-image-2" },
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
    events: readJson(STORAGE_KEYS.events, DEMO.events),
    pendingEvents: readJson(STORAGE_KEYS.pendingEvents, DEMO.pendingEvents),
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
  if (!localStorage.getItem(STORAGE_KEYS.events)) {
    const oldEvents = readJson(STORAGE_KEYS.oldEvents, null);
    if (Array.isArray(oldEvents)) saveJson(STORAGE_KEYS.events, oldEvents);
  }
  if (!localStorage.getItem(STORAGE_KEYS.pendingEvents)) {
    const oldPendingEvents = readJson(STORAGE_KEYS.oldPendingEvents, null);
    if (Array.isArray(oldPendingEvents)) saveJson(STORAGE_KEYS.pendingEvents, oldPendingEvents);
  }
}

function saveAdsEverywhere(ads) {
  saveJson(STORAGE_KEYS.ads, ads);
  saveJson(STORAGE_KEYS.oldAds, ads);
  saveJson(STORAGE_KEYS.marketAds, ads);
}

function setStatus(message) {
  const status = document.querySelector("#content-status");
  if (status) status.textContent = message;
}

function setCreativeStatus(message, isError = false) {
  const status = document.querySelector("#creative-status");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("error", Boolean(isError));
}

function setSettingsStatus(message, isError = false) {
  const status = document.querySelector("#settings-status");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("error", Boolean(isError));
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

function normalizeEvent(event) {
  const now = new Date().toISOString();
  return {
    id: String(event.id || `event-${Date.now()}`),
    title: String(event.title || "").trim(),
    description: String(event.description || "").trim(),
    venueName: String(event.venueName || "").trim(),
    address: String(event.address || "").trim(),
    city: String(event.city || "").trim(),
    state: String(event.state || "").trim().toUpperCase(),
    eventDate: String(event.eventDate || "").trim(),
    startTime: String(event.startTime || "").trim(),
    endTime: String(event.endTime || "").trim(),
    category: String(event.category || "Other").trim(),
    website: String(event.website || "").trim(),
    phone: String(event.phone || "").trim(),
    submittedByName: String(event.submittedByName || "").trim(),
    submittedByEmail: String(event.submittedByEmail || "").trim(),
    status: String(event.status || "pending").trim(),
    featured: event.featured === true || String(event.featured) === "true",
    createdAt: String(event.createdAt || now),
    updatedAt: String(event.updatedAt || now),
  };
}

function saveEventsEverywhere(events) {
  saveJson(STORAGE_KEYS.events, events);
  saveJson(STORAGE_KEYS.oldEvents, events);
}

function savePendingEventsEverywhere(events) {
  saveJson(STORAGE_KEYS.pendingEvents, events);
  saveJson(STORAGE_KEYS.oldPendingEvents, events);
}

function recordAnalytics(type, details = {}) {
  const events = readJson(STORAGE_KEYS.analytics, []);
  events.push({ type, details, at: new Date().toISOString() });
  saveJson(STORAGE_KEYS.analytics, events.slice(-500));
}

function setEventStatus(message, isError = false) {
  const status = document.querySelector("#event-status");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("error", Boolean(isError));
}

function formatEventDate(event) {
  return [event.eventDate, event.startTime && `${event.startTime}${event.endTime ? `–${event.endTime}` : ""}`].filter(Boolean).join(" · ");
}

function collectAdminEvent() {
  const form = document.querySelector("#admin-event-form");
  const data = new FormData(form);
  const existingId = String(data.get("id") || "");
  const existing = [...state().events, ...state().pendingEvents].find((event) => event.id === existingId) || {};
  return normalizeEvent({
    ...existing,
    id: existingId || `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: data.get("title"),
    description: data.get("description"),
    venueName: data.get("venueName"),
    address: data.get("address"),
    city: data.get("city"),
    state: data.get("state"),
    eventDate: data.get("eventDate"),
    startTime: data.get("startTime"),
    endTime: data.get("endTime"),
    category: data.get("category"),
    website: data.get("website"),
    phone: data.get("phone"),
    submittedByName: data.get("submittedByName"),
    submittedByEmail: data.get("submittedByEmail"),
    status: data.get("status"),
    featured: data.get("featured"),
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

function validateEvent(event) {
  return ["title", "venueName", "city", "state", "eventDate", "submittedByEmail"].filter((key) => !String(event[key] || "").trim());
}

function fillEventForm(event = {}) {
  const form = document.querySelector("#admin-event-form");
  if (!form) return;
  form.reset();
  const normalized = normalizeEvent(event);
  Object.entries(normalized).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = key === "featured" ? String(Boolean(value)) : value;
  });
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

function eventCardHtml(event, source) {
  const id = escapeHtml(event.id);
  return `<div class="row"><strong>${escapeHtml(event.title)}${event.featured ? " ⭐" : ""}</strong><span>${escapeHtml(event.status)}</span></div><p>${escapeHtml(event.venueName)} · ${escapeHtml(formatEventDate(event))} · ${escapeHtml(event.city)}, ${escapeHtml(event.state)}</p><small>${escapeHtml(event.category)} · ${escapeHtml(event.submittedByEmail)}</small><div class="event-actions"><button type="button" data-edit-event="${id}" data-source="${source}">Edit</button>${source === "pending" ? `<button type="button" data-approve-event="${id}">Approve</button><button type="button" class="secondary" data-reject-event="${id}">Reject</button>` : ""}<button type="button" class="secondary" data-feature-event="${id}" data-source="${source}">${event.featured ? "Unfeature" : "Feature"}</button><button type="button" class="danger" data-delete-event="${id}" data-source="${source}">Delete</button></div>`;
}

function renderEvents() {
  const pendingList = document.querySelector("#pending-event-list");
  const approvedList = document.querySelector("#approved-event-list");
  if (!pendingList || !approvedList) return;
  const current = state();
  const pending = current.pendingEvents.map(normalizeEvent).filter((event) => event.status !== "rejected");
  const approved = current.events.map(normalizeEvent).filter((event) => event.status === "approved").sort((a, b) => `${a.eventDate} ${a.startTime}`.localeCompare(`${b.eventDate} ${b.startTime}`));
  pendingList.innerHTML = pending.length ? "" : '<article class="list-card">No pending submissions.</article>';
  approvedList.innerHTML = approved.length ? "" : '<article class="list-card">No approved events yet.</article>';
  pending.forEach((event) => {
    const card = document.createElement("article");
    card.className = "list-card";
    card.innerHTML = eventCardHtml(event, "pending");
    pendingList.appendChild(card);
  });
  approved.forEach((event) => {
    const card = document.createElement("article");
    card.className = "list-card";
    card.innerHTML = eventCardHtml(event, "approved");
    approvedList.appendChild(card);
  });
}

function upsertEvent(event) {
  const normalized = normalizeEvent(event);
  const events = state().events.filter((item) => item.id !== normalized.id);
  const pending = state().pendingEvents.filter((item) => item.id !== normalized.id);
  if (normalized.status === "approved") events.push(normalized);
  else pending.push(normalized);
  saveEventsEverywhere(events);
  savePendingEventsEverywhere(pending);
  renderEvents();
  refreshExportBox();
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
  return { issue: current.issue, venues: current.venues, ads: current.ads, events: current.events, pendingEvents: current.pendingEvents, pottyfavor_events: current.events, pottyfavor_pending_events: current.pendingEvents, settings: current.settings, exportedAt: new Date().toISOString() };
}

function refreshExportBox() {
  document.querySelector("#json-box").value = JSON.stringify(exportPayload(), null, 2);
}

function importPayload(payload) {
  if (payload.issue) saveJson(STORAGE_KEYS.issue, payload.issue);
  if (Array.isArray(payload.venues)) saveJson(STORAGE_KEYS.venues, payload.venues);
  if (Array.isArray(payload.ads)) saveAdsEverywhere(payload.ads);
  const importedEvents = Array.isArray(payload.pottyfavor_events) ? payload.pottyfavor_events : payload.events;
  const importedPendingEvents = Array.isArray(payload.pottyfavor_pending_events) ? payload.pottyfavor_pending_events : payload.pendingEvents;
  if (Array.isArray(importedEvents)) saveEventsEverywhere(importedEvents.map(normalizeEvent));
  if (Array.isArray(importedPendingEvents)) savePendingEventsEverywhere(importedPendingEvents.map(normalizeEvent));
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
  const settings = state().settings;
  form.elements.qrBaseUrl.value = settings.qrBaseUrl || DEMO.settings.qrBaseUrl;
  form.elements.vercelApiBaseUrl.value = settings.vercelApiBaseUrl || "";
  form.elements.openAiImageModel.value = settings.openAiImageModel || "gpt-image-2";
  refreshEndpointDisplay();
}

const CREATIVE_PRESETS = {
  vegasRestaurant: { businessCategory: "Restaurant / Bar", targetAudience: "Las Vegas Strip diners, nightlife guests, and venue patrons scanning quickly", visualStyle: "Vegas-themed restaurant advertisement with craft drinks, craveable food, neon lights, premium black and gold accents, and polished nightlife energy", tone: "energetic, upscale, social, and urgent", brandColors: "black, gold, neon blue" },
  casinoOffer: { businessCategory: "Casino Offer", targetAudience: "casino guests, tourists, and loyalty members", visualStyle: "luxury casino promotion with polished gaming-floor atmosphere, jewel tones, gold highlights, and premium hospitality composition", tone: "exclusive, exciting, and high-value", brandColors: "black, gold, deep red" },
  homeServices: { businessCategory: "Home Services", targetAudience: "homeowners, property managers, and local families", visualStyle: "clean premium home-services ad with trustworthy crew, crisp before-and-after confidence, and bright professional finish", tone: "reliable, clear, and confidence-building", brandColors: "white, blue, green" },
  eventConcert: { businessCategory: "Event / Concert", targetAudience: "fans looking for things to do tonight", visualStyle: "premium concert poster energy with dramatic stage lighting, bold ticket-offer typography, and dynamic motion", tone: "exciting, urgent, and memorable", brandColors: "black, electric purple, warm gold" },
  retailCoupon: { businessCategory: "Retail Coupon", targetAudience: "nearby shoppers and mobile coupon users", visualStyle: "bright product-forward retail campaign with polished coupon callout, clean hierarchy, and high-contrast sale messaging", tone: "friendly, promotional, and easy to redeem", brandColors: "white, bold brand color, contrast accent" },
  transportation: { businessCategory: "Transportation", targetAudience: "travelers who need a ride now", visualStyle: "sleek transportation ad with city lights, motion blur, premium vehicle detail, and clear booking CTA", tone: "fast, dependable, and polished", brandColors: "black, yellow, silver" },
  outdoorAdventure: { businessCategory: "Outdoor / Adventure", targetAudience: "active locals, tourists, and weekend explorers", visualStyle: "premium outdoor adventure advertisement with golden-hour scenery, energetic action, rugged texture, and readable offer badge", tone: "inspiring, bold, and adventurous", brandColors: "forest green, sunset orange, cream" },
  localService: { businessCategory: "Local Service", targetAudience: "local residents and small businesses", visualStyle: "clean premium local-service ad with trustworthy people, crisp icons, and strong offer-first layout", tone: "helpful, reliable, and direct", brandColors: "navy, white, bright accent" },
};

let generatedCreative = null;

function collectCreativeBrief() {
  const data = new FormData(document.querySelector("#creative-form"));
  return {
    businessName: String(data.get("businessName") || ""),
    businessCategory: String(data.get("businessCategory") || ""),
    offer: String(data.get("offer") || ""),
    couponCode: String(data.get("couponCode") || ""),
    ctaText: String(data.get("ctaText") || ""),
    website: String(data.get("website") || ""),
    phone: String(data.get("phone") || ""),
    targetAudience: String(data.get("targetAudience") || ""),
    venueTargeting: String(data.get("venueTargeting") || ""),
    cityTargeting: String(data.get("cityTargeting") || ""),
    stateTargeting: String(data.get("stateTargeting") || "").toUpperCase(),
    brandColors: String(data.get("brandColors") || ""),
    visualStyle: String(data.get("visualStyle") || ""),
    tone: String(data.get("tone") || ""),
    requiredText: String(data.get("requiredText") || ""),
    optionalDisclaimer: String(data.get("optionalDisclaimer") || ""),
    adSize: String(data.get("adSize") || "Square"),
  };
}

const GENERATE_AD_IMAGE_PATH = "/api/generate-ad-image";

function stripTrailingSlash(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function endpointFromInput(input = "") {
  const raw = stripTrailingSlash(input);
  if (!raw) return GENERATE_AD_IMAGE_PATH;

  let url;
  try {
    url = new URL(raw);
  } catch (_) {
    if (raw === GENERATE_AD_IMAGE_PATH || raw.endsWith(GENERATE_AD_IMAGE_PATH)) return raw;
    return `${raw.replace(/\/admin(?:\/.*)?$/i, "")}${GENERATE_AD_IMAGE_PATH}`;
  }

  if (url.hostname.endsWith("github.io")) {
    throw new Error("Do not use GitHub Pages for the Vercel API Base URL. Use your Vercel deployment URL, for example https://stalltalk.vercel.app.");
  }

  if (url.pathname === GENERATE_AD_IMAGE_PATH) return url.toString().replace(/\/$/, "");
  url.pathname = url.pathname.replace(/\/admin(?:\/.*)?$/i, "").replace(/\/+$/, "");
  if (!url.pathname || url.pathname === "/") url.pathname = GENERATE_AD_IMAGE_PATH;
  else url.pathname = `${url.pathname}${GENERATE_AD_IMAGE_PATH}`;
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function creativeEndpoint() {
  return endpointFromInput(state().settings.vercelApiBaseUrl || "");
}

function refreshEndpointDisplay() {
  const output = document.querySelector("#settings-endpoint");
  if (!output) return;
  const formValue = document.querySelector('#settings-form [name="vercelApiBaseUrl"]')?.value;
  try {
    output.textContent = endpointFromInput(formValue || state().settings.vercelApiBaseUrl || "");
  } catch (error) {
    output.textContent = error.message;
  }
}

function creativeVenueAtmosphere(brief) {
  return [brief.venueTargeting, brief.cityTargeting, brief.stateTargeting].map((item) => String(item || "").trim()).filter(Boolean).join(", ") || "the selected venue and city atmosphere";
}

function buildEnhancedCreativePrompt(brief) {
  const businessName = String(brief.businessName || "the business").trim();
  const category = String(brief.businessCategory || "local sponsor").trim();
  const offer = String(brief.offer || "the featured offer").trim();
  const cta = String(brief.ctaText || "Claim Offer").trim();
  const coupon = String(brief.couponCode || "").trim();
  const style = String(brief.visualStyle || "premium modern commercial advertising").trim();
  const tone = String(brief.tone || "bold, polished, and persuasive").trim();
  const colors = String(brief.brandColors || "premium brand colors with high contrast").trim();
  const requiredText = String(brief.requiredText || "").trim();
  const disclaimer = String(brief.optionalDisclaimer || "").trim();
  return [
    `Create a finished, high-quality commercial advertisement for ${businessName}, a ${category}.`,
    `Feature the business name "${businessName}" prominently with readable bold typography.`,
    `Include the offer text "${offer}" as the main promotional message.`,
    `Include a clear CTA: "${cta}".`,
    coupon ? `Include coupon code "${coupon}" in a polished coupon badge.` : "Do not invent a coupon code if none is provided.",
    `Match the selected visual style: ${style}. Match the tone: ${tone}.`,
    `Match the venue/city atmosphere: ${creativeVenueAtmosphere(brief)}.`,
    `Use premium visual composition, commercial lighting, strong hierarchy, clean spacing, ${colors}, and an eye-catching layout for restroom readers scanning quickly.`,
    `Design should be ready to publish in Potty Favor sponsor slots in ${brief.adSize || "Square"} format.`,
    requiredText ? `Also include this required text exactly if it fits: ${requiredText}.` : "Only include intentional readable ad copy; no extra filler text.",
    disclaimer ? `Add this disclaimer only if legible without clutter: ${disclaimer}.` : "Avoid tiny legal microcopy unless requested.",
    "Avoid mockup frames, placeholder text, lorem ipsum, watermarks, UI screenshots, fake app screens, unfinished layout, and broken image placeholders.",
  ].join(" ");
}

function billingLimitMessage(payload) {
  const text = `${payload?.error || ""} ${payload?.diagnostic?.errorType || ""}`.toLowerCase();
  return text.includes("billing") || text.includes("hard_limit") || text.includes("insufficient_quota");
}

function showCreativeResult(payload, brief) {
  const output = document.querySelector("#creative-output");
  const publish = document.querySelector("#creative-publish");
  const preview = document.querySelector("#creative-preview");
  document.querySelector("#creative-prompt").textContent = payload.promptUsed || "No prompt returned.";
  document.querySelector("#creative-diagnostics").textContent = JSON.stringify({ endpointCalled: payload.endpointCalled || creativeEndpoint(), ...(payload.diagnostic || payload.diagnostics || { ok: Boolean(payload.imageUrl || payload.imageBase64) }) }, null, 2);
  output.hidden = false;
  const imageUrl = payload.imageUrl || (payload.imageBase64 ? `data:image/png;base64,${payload.imageBase64}` : "");
  if (!imageUrl) {
    generatedCreative = null;
    preview.removeAttribute("src");
    publish.hidden = true;
    const message = billingLimitMessage(payload) ? "OpenAI billing limit reached. Update billing in OpenAI Platform." : (payload.error || "Generation failed. Diagnostics returned without image data.");
    setCreativeStatus(message, true);
    return;
  }
  preview.src = imageUrl;
  generatedCreative = { ...payload, imageUrl, brief };
  publish.hidden = false;
  setCreativeStatus("Generated image ready. Review it, then publish to a slot.");
}

function endpointErrorMessage(response, payload, rawText, endpoint) {
  if (response.status === 405) return "405 Method Not Allowed. The AI Studio is not reaching the Vercel image API. Check that Vercel API Base URL is set to https://stalltalk.vercel.app or your current Vercel deployment URL.";
  const contentType = response.headers?.get("Content-Type") || "";
  if (contentType.toLowerCase().includes("text/html") || /^\s*<!doctype html|^\s*<html[\s>]/i.test(rawText || "")) return "Received HTML instead of JSON. The endpoint is probably pointed at the website, not /api/generate-ad-image.";
  if (billingLimitMessage(payload)) return "OpenAI billing limit reached. Update billing in OpenAI Platform.";
  return payload?.error || `API request to ${endpoint} failed with HTTP ${response.status}.`;
}

async function parseEndpointResponse(response, endpoint) {
  const rawText = await response.text();
  let payload = {};
  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch (_) {
      payload = { diagnostic: { errorType: "non_json_response" } };
    }
  }
  const message = endpointErrorMessage(response, payload, rawText, endpoint);
  if (!response.ok || !rawText || payload.diagnostic?.errorType === "non_json_response") {
    return { ...payload, error: message, endpointCalled: endpoint, diagnostic: { ...(payload.diagnostic || payload.diagnostics || {}), errorType: payload.diagnostic?.errorType || payload.diagnostics?.errorType || (response.ok ? "non_json_response" : "http_error"), httpStatus: response.status } };
  }
  return { ...payload, endpointCalled: endpoint };
}

async function generateCreativeAd(brief) {
  if (!brief.businessName || !brief.offer) throw new Error("Business name and offer are required.");
  const settings = state().settings;
  const endpoint = creativeEndpoint();
  const creativeBrief = { ...brief, prompt: buildEnhancedCreativePrompt(brief), openAiImageModel: settings.openAiImageModel || "gpt-image-2" };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(creativeBrief),
  });
  return parseEndpointResponse(response, endpoint);
}

function generatedAdFromPublishForm() {
  if (!generatedCreative?.imageUrl) throw new Error("Generate a valid image before publishing. Broken fallback graphics are not saved.");
  const publishData = new FormData(document.querySelector("#creative-publish-form"));
  const brief = generatedCreative.brief || {};
  const slot = Number(publishData.get("slot") || 1);
  const targetingType = String(publishData.get("targetingType") || "global");
  const market = targetingType === "global" ? "" : String(publishData.get("market") || brief.venueTargeting || brief.cityTargeting || brief.stateTargeting || "");
  return {
    slot,
    advertiserName: brief.businessName || generatedCreative.businessName || "Generated Sponsor",
    businessName: brief.businessName || generatedCreative.businessName || "Generated Sponsor",
    headline: generatedCreative.headline || brief.offer || "Sponsor Message",
    subheadline: generatedCreative.subheadline || "",
    offer: brief.offer || generatedCreative.headline || "Reader-only offer",
    couponCode: generatedCreative.couponCode || brief.couponCode || "",
    cta: generatedCreative.cta || generatedCreative.ctaText || brief.ctaText || "Learn More",
    targetUrl: brief.website || "#",
    image: generatedCreative.imageUrl,
    imageUrl: generatedCreative.imageUrl,
    imageBase64: generatedCreative.imageBase64 || "",
    adMode: "image",
    adSize: brief.adSize || "Square",
    targetingType,
    market,
    active: true,
    promptUsed: generatedCreative.promptUsed || "",
    diagnostics: generatedCreative.diagnostic || generatedCreative.diagnostics || {},
  };
}

function loadAll() {
  const current = state();
  fillIssueForm(current.issue);
  renderVenues();
  renderAds();
  loadSettings();
  renderAnalytics();
  renderEvents();
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
      if (button.dataset.tab === "events") renderEvents();
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
    saveAdsEverywhere(DEMO.ads);
    saveJson(STORAGE_KEYS.settings, DEMO.settings);
    saveEventsEverywhere(DEMO.events);
    savePendingEventsEverywhere(DEMO.pendingEvents);
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
  document.querySelector("#admin-event-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const eventItem = collectAdminEvent();
    const missing = validateEvent(eventItem);
    if (missing.length) {
      setEventStatus(`Please complete: ${missing.join(", ")}.`, true);
      return;
    }
    upsertEvent(eventItem);
    if (eventItem.status === "approved") recordAnalytics("event_approved", { id: eventItem.id, title: eventItem.title });
    fillEventForm();
    setEventStatus("Event saved locally.");
  });
  document.querySelector("#clear-event-form").addEventListener("click", () => {
    fillEventForm();
    setEventStatus("Event form cleared.");
  });
  document.querySelector("#publish-events").addEventListener("click", () => {
    const approved = state().events.map(normalizeEvent).filter((event) => event.status === "approved");
    saveEventsEverywhere(approved);
    renderEvents();
    refreshExportBox();
    setEventStatus("Published approved event list to pottyfavor_events.");
  });
  document.querySelector("#tab-events").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const current = state();
    const id = button.dataset.editEvent || button.dataset.approveEvent || button.dataset.rejectEvent || button.dataset.featureEvent || button.dataset.deleteEvent;
    if (!id) return;
    const source = button.dataset.source || "pending";
    const pool = source === "approved" ? current.events : current.pendingEvents;
    const eventItem = normalizeEvent(pool.find((item) => item.id === id) || {});
    if (button.dataset.editEvent) fillEventForm(eventItem);
    if (button.dataset.approveEvent) {
      upsertEvent({ ...eventItem, status: "approved", updatedAt: new Date().toISOString() });
      recordAnalytics("event_approved", { id: eventItem.id, title: eventItem.title });
      setEventStatus("Event approved and published.");
    }
    if (button.dataset.rejectEvent) {
      const pending = current.pendingEvents.map((item) => item.id === id ? { ...item, status: "rejected", updatedAt: new Date().toISOString() } : item);
      savePendingEventsEverywhere(pending);
      renderEvents();
      refreshExportBox();
      setEventStatus("Event rejected. It will not publish.");
    }
    if (button.dataset.featureEvent) {
      const update = (items) => items.map((item) => item.id === id ? { ...item, featured: !item.featured, updatedAt: new Date().toISOString() } : item);
      if (source === "approved") saveEventsEverywhere(update(current.events));
      else savePendingEventsEverywhere(update(current.pendingEvents));
      renderEvents();
      refreshExportBox();
    }
    if (button.dataset.deleteEvent) {
      if (source === "approved") saveEventsEverywhere(current.events.filter((item) => item.id !== id));
      else savePendingEventsEverywhere(current.pendingEvents.filter((item) => item.id !== id));
      renderEvents();
      refreshExportBox();
      setEventStatus("Event deleted.");
    }
  });
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
    saveAdsEverywhere(ads);
    renderAds();
  });
  document.querySelector("#creative-presets").addEventListener("click", (event) => {
    const button = event.target.closest("[data-preset]");
    if (!button) return;
    const preset = CREATIVE_PRESETS[button.dataset.preset];
    const form = document.querySelector("#creative-form");
    Object.entries(preset).forEach(([key, value]) => {
      if (form.elements[key] && !form.elements[key].value) form.elements[key].value = value;
    });
    setCreativeStatus(`${button.textContent} preset applied.`);
  });
  document.querySelector("#creative-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const brief = collectCreativeBrief();
    document.querySelector("#creative-publish").hidden = true;
    try {
      setCreativeStatus(`Generating finished ad image via ${creativeEndpoint()}…`);
      const payload = await generateCreativeAd(brief);
      showCreativeResult(payload, brief);
    } catch (error) {
      generatedCreative = null;
      document.querySelector("#creative-output").hidden = false;
      document.querySelector("#creative-preview").removeAttribute("src");
      document.querySelector("#creative-prompt").textContent = "";
      document.querySelector("#creative-diagnostics").textContent = JSON.stringify({ error: error.message }, null, 2);
      setCreativeStatus(error.message, true);
    }
  });
  document.querySelector("#creative-publish-form").addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const ad = generatedAdFromPublishForm();
      activeSlot = ad.slot;
      const ads = state().ads.filter((item) => !(Number(item.slot) === Number(ad.slot) && String(item.targetingType || "global") === String(ad.targetingType || "global") && String(item.market || "") === String(ad.market || "")));
      ads.push(ad);
      saveAdsEverywhere(ads);
      renderAds();
      refreshExportBox();
      setCreativeStatus(`Published generated ad to slot ${ad.slot}.`);
    } catch (error) {
      setCreativeStatus(error.message, true);
    }
  });
  document.querySelector('#settings-form [name="vercelApiBaseUrl"]').addEventListener("input", refreshEndpointDisplay);
  document.querySelector("#save-settings").addEventListener("click", () => {
    const data = new FormData(document.querySelector("#settings-form"));
    try {
      const vercelApiBaseUrl = stripTrailingSlash(String(data.get("vercelApiBaseUrl") || ""));
      endpointFromInput(vercelApiBaseUrl);
      saveJson(STORAGE_KEYS.settings, {
        qrBaseUrl: String(data.get("qrBaseUrl") || DEMO.settings.qrBaseUrl),
        vercelApiBaseUrl,
        openAiImageModel: String(data.get("openAiImageModel") || "gpt-image-2"),
      });
      updateQrPreview();
      refreshEndpointDisplay();
      setSettingsStatus("Settings saved locally.");
    } catch (error) {
      setSettingsStatus(error.message, true);
      refreshEndpointDisplay();
    }
  });
  document.querySelector("#test-api-endpoint").addEventListener("click", async () => {
    const brief = { businessName: "Potty Favor Endpoint Test", businessCategory: "Local Service", offer: "Endpoint test", ctaText: "Test Now", targetAudience: "admin testers", brandColors: "blue, gold", visualStyle: "clean professional", tone: "clear", requiredText: "API TEST", adSize: "Square" };
    try {
      const endpoint = endpointFromInput(document.querySelector('#settings-form [name="vercelApiBaseUrl"]')?.value || state().settings.vercelApiBaseUrl || "");
      setSettingsStatus(`Testing endpoint with POST: ${endpoint}`);
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...brief, prompt: buildEnhancedCreativePrompt(brief), openAiImageModel: state().settings.openAiImageModel || "gpt-image-2" }) });
      const payload = await parseEndpointResponse(response, endpoint);
      setSettingsStatus(response.ok ? `Endpoint POST reached ${endpoint}. ${payload.imageUrl || payload.imageBase64 ? "Image returned." : (payload.error || "JSON response returned without image data.")}` : `${payload.error} Endpoint called: ${endpoint}`, !response.ok || !(payload.imageUrl || payload.imageBase64));
    } catch (error) {
      setSettingsStatus(`API endpoint test failed: ${error.message}`, true);
    }
  });
  document.querySelector("#test-openai-image").addEventListener("click", async () => {
    const brief = { businessName: "Potty Favor API Test", businessCategory: "Local Service", offer: "API test graphic", ctaText: "Test Now", targetAudience: "admin testers", brandColors: "blue, gold", visualStyle: "simple clean professional", tone: "clear", requiredText: "API TEST", adSize: "Square" };
    setSettingsStatus("Testing OpenAI image generation…");
    try {
      const payload = await generateCreativeAd(brief);
      setSettingsStatus(payload.imageUrl || payload.imageBase64 ? "OpenAI image generation test succeeded." : (payload.error || "Image test returned no image."), !(payload.imageUrl || payload.imageBase64));
    } catch (error) {
      setSettingsStatus(error.message, true);
    }
  });
  document.querySelector("#refresh-export").addEventListener("click", refreshExportBox);
  document.querySelector("#import-text").addEventListener("click", () => importPayload(JSON.parse(document.querySelector("#json-box").value)));
}

function init() {
  migrateOldKeys();
  if (!localStorage.getItem(STORAGE_KEYS.issue)) saveJson(STORAGE_KEYS.issue, DEMO.issue);
  if (!localStorage.getItem(STORAGE_KEYS.venues)) saveJson(STORAGE_KEYS.venues, DEMO.venues);
  if (!localStorage.getItem(STORAGE_KEYS.ads)) saveAdsEverywhere(DEMO.ads);
  if (!localStorage.getItem(STORAGE_KEYS.settings)) saveJson(STORAGE_KEYS.settings, DEMO.settings);
  if (!localStorage.getItem(STORAGE_KEYS.events)) saveEventsEverywhere(DEMO.events);
  if (!localStorage.getItem(STORAGE_KEYS.pendingEvents)) savePendingEventsEverywhere(DEMO.pendingEvents);
  bindTabs();
  bindActions();
  loadAll();
}

document.addEventListener("DOMContentLoaded", init);
