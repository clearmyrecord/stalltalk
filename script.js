const STORAGE_KEYS = {
  draft: "stalltalk_content_draft",
  published: "stalltalk_content_published",
  ads: window.StallTalkGraphicAds?.storageKey || "stalltalk_ad_slots",
  settings: "stalltalk_settings",
  legacySettings: "stalltalk_issue_settings",
  venues: "stalltalk_venues",
  qrLocations: "stalltalk_qr_locations",
  issues: "stalltalk_issues",
  campaigns: "stalltalk_campaigns",
  advertisers: "stalltalk_advertisers",
  analyticsEvents: "stalltalk_analytics_events",
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

const DEFAULT_CONTENT = {
  heroTitle: "Your quick city guide while you take five.",
  intro: "Fresh local bites, quick laughs, useful venue tips, and eight sponsor offers that are easy to tap without interrupting the read.",
  featuredTitle: "The Two-Minute Guide to Winning the Line",
  article: "Keep your crew moving: pick a meeting spot, screenshot your tickets, hydrate before the encore, and never trust a casino hallway that says the exit is only one more turn away.",
  joke: "Why did the restroom magazine get promoted? It had excellent stall presence.",
  event: "Look for a pop-up performance, late-night menu, or photo-worthy stop near the venue before heading home.",
  trivia: "Las Vegas has more hotel rooms than many entire cities.\nNeon signs glow through electrified gas in glass tubes.\nA good restroom publication should be readable in under two minutes.",
  word: "Serendipity — finding something good while looking for something else.",
  deal: "Show this issue at a participating local spot for a surprise restroom-reader perk.",
};

const DEMO_NETWORK = {
  venues: [
    { id: "venue-mgm", name: "MGM Grand Las Vegas", slug: "mgm-grand-las-vegas", businessType: "Casino resort", city: "Las Vegas", state: "NV", status: "active" },
  ],
  qrLocations: [
    { qrId: "ST-MGM-CASINO-M-001", venueId: "venue-mgm", locationName: "MGM casino men’s restroom stall 1", placementType: "stall-door", targetUrl: "/?venue=mgm-grand-las-vegas&qr=ST-MGM-CASINO-M-001", active: true, scanCount: 0 },
    { qrId: "mens-stall-1", venueId: "venue-mgm", locationName: "MGM men’s restroom stall 1", placementType: "stall-door", targetUrl: "/?venue=mgm-grand-las-vegas&qr=mens-stall-1", active: true, scanCount: 0 },
  ],
  issues: [
    { id: "issue-mgm-grand-las-vegas", title: "June 2026 MGM Grand Las Vegas Potty Favor", month: "June", year: "2026", city: "Las Vegas", venueId: "venue-mgm", venueName: "MGM Grand Las Vegas", status: "published", contentBlocks: ["Your MGM Grand quick city guide while you take five.", "Fresh picks, venue tips, and restroom-reader perks at MGM Grand Las Vegas.", "Hydrate, pick a meetup point, and tap one offer before your next casino-floor detour."], assignedAdSlots: ["1", "2", "3", "4", "5", "6", "7", "8"] },
  ],
};

function seedDemoNetworkIfMissing() {
  const venues = ensureArray(STORAGE_KEYS.venues);
  const qrLocations = ensureArray(STORAGE_KEYS.qrLocations);
  const issues = ensureArray(STORAGE_KEYS.issues);
  const nextVenues = venues.some((venue) => venue.id === "venue-mgm" || venue.slug === "mgm-grand-las-vegas") ? venues : [...venues, ...DEMO_NETWORK.venues];
  const nextQrLocations = qrLocations.some((qr) => qr.qrId === "ST-MGM-CASINO-M-001") ? qrLocations : [...qrLocations, DEMO_NETWORK.qrLocations[0]];
  const nextIssues = issues.some((issue) => issue.id === "issue-mgm-grand-las-vegas") ? issues : [...issues, ...DEMO_NETWORK.issues];
  saveJson(STORAGE_KEYS.venues, nextVenues);
  saveJson(STORAGE_KEYS.qrLocations, nextQrLocations);
  saveJson(STORAGE_KEYS.issues, nextIssues);
}

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

function ensureArray(key) {
  const value = readJson(key, []);
  return Array.isArray(value) ? value : [];
}

function params() {
  return new URLSearchParams(window.location.search);
}

function eventId() {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function recordEvent(type, details = {}) {
  const event = { eventId: eventId(), type, venueSlug: activeContext.venue?.slug || "", qrId: activeContext.qr?.qrId || params().get("qr") || "", issueId: activeContext.issue?.id || "", adSlot: details.adSlot || "", campaignId: details.campaignId || "", timestamp: new Date().toISOString() };
  saveJson(STORAGE_KEYS.analyticsEvents, [event, ...ensureArray(STORAGE_KEYS.analyticsEvents)].slice(0, 1000));
}

function recordAdImpressionOnce(slotNumber, campaignId = "") {
  const key = String(slotNumber);
  if (recordedAdImpressions.has(key)) return;
  recordedAdImpressions.add(key);
  recordEvent("ad_impression", { adSlot: key, campaignId });
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

function getActiveVenue() {
  const venueSlug = params().get("venue");
  const venues = ensureArray(STORAGE_KEYS.venues);
  if (venueSlug) return venues.find((venue) => venue.slug === venueSlug) || null;
  return venues.find((venue) => venue.slug === "mgm-grand-las-vegas") || null;
}

function getActiveQr(venue) {
  const qrId = params().get("qr");
  if (!venue || !qrId) return null;
  return ensureArray(STORAGE_KEYS.qrLocations).find((qr) => qr.venueId === venue.id && qr.qrId === qrId) || null;
}

function getActiveIssue(venue) {
  const issues = ensureArray(STORAGE_KEYS.issues).filter((issue) => issue.status === "published");
  return issues.find((issue) => issue.venueId === venue?.id) || issues.find((issue) => issue.venueName === venue?.name) || issues[0] || null;
}

const activeContext = { venue: null, qr: null, issue: null };
const recordedAdImpressions = new Set();

function renderIssueSettings(settings = { ...DEFAULT_SETTINGS, ...readJson(STORAGE_KEYS.legacySettings, {}), ...readJson(STORAGE_KEYS.settings, {}) }) {
  const venue = activeContext.venue;
  const issue = activeContext.issue;
  const brandName = settings.logoText || settings.brand || settings.activeBrand || "Potty Favor";
  const cityState = venue ? `${venue.city}, ${venue.state}` : (issue?.city || settings.city);
  setText('[data-issue-field="brand"]', settings.activeBrand || brandName);
  setText('[data-brand-title]', brandName);
  setText('[data-issue-field="city"]', cityState);
  setText('[data-issue-field="venue"]', venue?.name || issue?.venueName || settings.venue);
  setText('[data-issue-field="monthYear"]', issue ? `${issue.month} ${issue.year}` : settings.monthYear);
  setText('[data-issue-field="issueNumber"]', settings.issueNumber);
  const tagline = document.querySelector(".pf-tagline");
  if (tagline) tagline.textContent = settings.tagline || DEFAULT_SETTINGS.tagline;
  document.body.dataset.theme = settings.colorTheme || "vegas-neon";
  document.title = `${brandName} by Stall Talk`;
}

function renderPublishedContent(content = readJson(STORAGE_KEYS.published, DEFAULT_CONTENT)) {
  const issue = activeContext.issue;
  const merged = { ...DEFAULT_CONTENT, ...content };
  if (issue?.contentBlocks?.length) {
    merged.heroTitle = issue.contentBlocks[0] || merged.heroTitle;
    merged.intro = issue.contentBlocks[1] || merged.intro;
    merged.article = issue.contentBlocks.slice(2).join("\n\n") || merged.article;
    merged.featuredTitle = issue.title || merged.featuredTitle;
  }
  Object.entries(merged).forEach(([key, value]) => {
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

function campaignForSlot(slotNumber) {
  const venueId = activeContext.venue?.id;
  const slots = readJson(STORAGE_KEYS.ads, []);
  const campaigns = ensureArray(STORAGE_KEYS.campaigns);
  if (Array.isArray(slots)) {
    const slot = slots.find((item) => String(item.slotNumber) === String(slotNumber));
    const campaign = campaigns.find((item) => item.id === (slot?.campaignId || slot?.campaignAssigned));
    if (campaign && campaign.status === "active" && (!campaign.selectedVenues?.length || campaign.selectedVenues.includes(venueId))) return campaign;
  } else if (slots[String(slotNumber)]) {
    return slots[String(slotNumber)];
  }
  return campaigns.find((campaign) => campaign.status === "active" && (campaign.selectedSlots || []).includes(String(slotNumber)) && (!campaign.selectedVenues?.length || campaign.selectedVenues.includes(venueId))) || null;
}

function updateAdCard(card, slotNumber, ad) {
  card.dataset.campaignId = ad?.id || ad?.campaignId || "";
  if (window.StallTalkGraphicAds && ad && (ad.headline || ad.businessName || window.StallTalkGraphicAds.imageSource(ad))) {
    card.classList.add("pf-ad-card-generated");
    card.replaceChildren(window.StallTalkGraphicAds.build(ad, { slotNumber, compact: true }));
    recordAdImpressionOnce(slotNumber, card.dataset.campaignId);
    return;
  }
  const label = card.querySelector(".ad-label");
  const title = card.querySelector("strong");
  const copy = card.querySelector("p");
  const link = card.querySelector("a");
  if (label) label.textContent = `Ad Slot ${slotNumber}`;
  if (title) title.textContent = ad?.businessName || ad?.advertiserName || ad?.headline || title.textContent;
  if (copy) copy.textContent = ad?.offer || ad?.subheadline || copy.textContent;
  if (link) {
    link.href = normalizeContactHref(ad?.website || ad?.phone || ad?.contact || ad?.contactUrl);
    link.textContent = ad?.ctaText || ad?.ctaButtonText || "Claim offer";
    link.setAttribute("aria-label", `View ${ad?.businessName || ad?.advertiserName || "sponsor"} offer`);
  }
  if (ad) recordAdImpressionOnce(slotNumber, card.dataset.campaignId);
}

function updateMiniAd(card, slotNumber, ad) {
  const slot = card.querySelector("span");
  const title = card.querySelector("strong");
  const copy = card.querySelector("small");
  if (slot) slot.textContent = `Ad Slot ${slotNumber}`;
  if (title) title.textContent = ad?.businessName || ad?.advertiserName || ad?.headline || title.textContent;
  if (copy) copy.textContent = ad?.offer || ad?.subheadline || copy.textContent;
}

function renderAdSlots() {
  for (let slotNumber = 1; slotNumber <= 8; slotNumber += 1) {
    const ad = campaignForSlot(slotNumber);
    if (!ad) {
      recordAdImpressionOnce(slotNumber);
      continue;
    }
    document.querySelectorAll(`[data-ad="${slotNumber}"]`).forEach((card) => updateAdCard(card, slotNumber, ad));
    document.querySelectorAll(`[data-mini-ad="${slotNumber}"], #ad-${slotNumber}`).forEach((card) => updateMiniAd(card, slotNumber, ad));
  }
}

function updateQrScanCount() {
  if (!activeContext.qr) return;
  const qrs = ensureArray(STORAGE_KEYS.qrLocations).map((qr) => qr.venueId === activeContext.qr.venueId && qr.qrId === activeContext.qr.qrId ? { ...qr, scanCount: Number(qr.scanCount || 0) + 1 } : qr);
  saveJson(STORAGE_KEYS.qrLocations, qrs);
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
    if (link.dataset.tapFeedbackBound === "true") return;
    link.dataset.tapFeedbackBound = "true";
    link.addEventListener("click", () => {
      const card = link.closest("[data-ad], [data-mini-ad]");
      const slot = card?.dataset.ad || card?.dataset.miniAd || "";
      const campaignId = card?.dataset.campaignId || "";
      recordEvent(link.textContent.toLowerCase().includes("coupon") || link.textContent.toLowerCase().includes("claim") ? "coupon_click" : "ad_click", { adSlot: slot, campaignId });
      link.classList.add("was-tapped");
      window.setTimeout(() => link.classList.remove("was-tapped"), 500);
    });
  });
}

function refreshIssue() {
  activeContext.venue = getActiveVenue();
  activeContext.qr = getActiveQr(activeContext.venue);
  activeContext.issue = getActiveIssue(activeContext.venue);
  renderIssueSettings();
  renderPublishedContent();
  renderAdSlots();
  wireTapFeedback();
}

seedDemoNetworkIfMissing();
wireArticleExpansionLabels();
refreshIssue();
recordEvent("issue_view");
if (params().get("venue") || params().get("qr")) {
  recordEvent("qr_scan");
  updateQrScanCount();
}

window.addEventListener("storage", (event) => {
  if ([STORAGE_KEYS.published, STORAGE_KEYS.ads, STORAGE_KEYS.settings, STORAGE_KEYS.venues, STORAGE_KEYS.issues, STORAGE_KEYS.campaigns].includes(event.key)) {
    refreshIssue();
  }
});
