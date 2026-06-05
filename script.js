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
  standardIssue: "stalltalk_standard_issue",
  cityIssues: "stalltalk_city_issues",
  venueIssueOverrides: "stalltalk_venue_issue_overrides",
  marketAds: "stalltalk_market_ads",
};

const DEFAULT_SETTINGS = {
  activeBrand: "Potty Favor",
  brand: "Potty Favor",
  logoText: "Potty Favor",
  tagline: "Scan. Read. Save.",
  colorTheme: "clean-publication",
  issueNumber: "001",
  city: "National Edition",
  venue: "",
  monthYear: "June 2026",
  standardMonthlyIssue: "Enabled",
  venueContentOverride: "Use when published",
  cityContentOverride: "Use when published",
  adTargetingMode: "QR/Venue",
};

const DEFAULT_CONTENT = {
  heroTitle: "Your restroom-sized guide to what’s worth knowing now.",
  intro: "A polished monthly Potty Favor issue: one helpful read, one laugh, one fact set, one word, one quote, one deal, and one event idea.",
  featuredTitle: "The Two-Minute Reset: Make the Most of a Quick Pause",
  article: "Use this small break to reset the night. Check your next stop, drink some water, pick a simple meetup point, and choose one useful offer before you head back out. The best plans are easy to remember and even easier to share.",
  joke: "Why did the restroom reader make everyone smile? It knew how to deliver a clean punchline.",
  event: "Look for a pop-up market, neighborhood music night, gallery opening, or late menu worth adding to your route.",
  trivia: "Short mobile articles are easier to finish in busy public spaces.\nA clear offer usually beats a clever offer when readers have seconds to decide.\nA good local publication can feel useful without requiring every venue to have custom copy.",
  word: "Wayfinding — the art of figuring out where you are, where you are going, and what is worth noticing on the way.",
  deal: "Show this issue at a participating sponsor for a reader perk, or tap a sponsor card to see what is available near you.",
  quote: "“A good pause does not slow the day down; it helps the next move feel clearer.”",
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
    { id: "issue-mgm-grand-las-vegas", title: "MGM Grand Two-Minute Vegas Reset", month: "June", year: "2026", city: "Las Vegas", state: "NV", venueId: "venue-mgm", venueName: "MGM Grand Las Vegas", status: "published", issueType: "venue", content: { heroTitle: "Your MGM Grand quick read before the next Vegas move.", intro: "Venue-aware tips, a clean laugh, and a few Las Vegas ideas for readers scanning from MGM Grand.", featuredTitle: "How to Regroup at MGM Grand in Two Minutes", article: "Pick a landmark before leaving the restroom, screenshot the show or dinner details, hydrate, and choose one nearby sponsor offer before the casino floor pulls everyone in a different direction." }, contentBlocks: ["Your MGM Grand quick read before the next Vegas move.", "Venue-aware tips, a clean laugh, and a few Las Vegas ideas for readers scanning from MGM Grand.", "Pick a landmark before leaving the restroom, screenshot the show or dinner details, hydrate, and choose one nearby sponsor offer before the casino floor pulls everyone in a different direction."], assignedAdSlots: ["1", "2", "3", "4", "5", "6", "7", "8"] },
    { id: "issue-las-vegas-standard", title: "Las Vegas After-Dark Pocket Guide", month: "June", year: "2026", city: "Las Vegas", state: "NV", status: "published", issueType: "city", content: { heroTitle: "A quick Las Vegas guide for your next bright-light detour.", intro: "A city edition with fast ideas for food, shows, photos, and low-effort wins near the Strip.", featuredTitle: "Three Easy Vegas Moves Between Stops", article: "Choose one photo stop, one shareable snack, and one comfortable meetup point. Vegas rewards short detours when the plan is simple enough to explain in one text." } },
  ],
  standardIssue: { id: "standard-june-2026", title: "Potty Favor Monthly Standard Issue", month: "June", year: "2026", city: "National Edition", state: "", status: "published", issueType: "standard", content: DEFAULT_CONTENT },
};

const DEMO_MARKET_ADS = {
  qr: {
    "ST-MGM-CASINO-M-001": [
      { slotNumber: 1, businessName: "MGM Grand Rewards", offer: "Tap for a same-day resort perk", couponCode: "MGMQR", ctaText: "See MGM Perk", website: "mgmresorts.com", market: "Las Vegas", state: "NV", adMode: "template", template: "luxury", primaryColor: "#111827", secondaryColor: "#d4af37", accentColor: "#ffffff" },
    ],
  },
  venue: {
    "mgm-grand-las-vegas": [
      { slotNumber: 2, businessName: "MGM Dining", offer: "Reader pick: late-night bite nearby", couponCode: "DINE", ctaText: "View Dining", website: "mgmresorts.com", market: "Las Vegas", state: "NV", adMode: "template", template: "vegas" },
    ],
  },
  city: {
    "las-vegas": [
      { slotNumber: 1, businessName: "Neon Bites", offer: "10% off late-night tacos", couponCode: "VEGAS10", ctaText: "Claim Deal", website: "example.com/neon-bites", market: "Las Vegas", state: "NV", adMode: "template", template: "coupon" },
      { slotNumber: 2, businessName: "Strip Photo Tours", offer: "Two-for-one mini photo stop", couponCode: "FLASH", ctaText: "Book Now", website: "example.com/photo", market: "Las Vegas", state: "NV", adMode: "template", template: "event" },
      { slotNumber: 3, businessName: "Hydrate Vegas", offer: "Free electrolyte add-on", couponCode: "WATER", ctaText: "Get Offer", website: "example.com/hydrate", market: "Las Vegas", state: "NV", adMode: "template", template: "family" },
      { slotNumber: 4, businessName: "Monorail Quick Pass", offer: "Save on a day pass", couponCode: "RIDE", ctaText: "Ride Faster", website: "example.com/ride", market: "Las Vegas", state: "NV", adMode: "template", template: "contractor" },
      { slotNumber: 5, businessName: "Comedy Tonight", offer: "$5 off the late show", couponCode: "LAUGH", ctaText: "See Shows", website: "example.com/comedy", market: "Las Vegas", state: "NV", adMode: "template", template: "vegas" },
      { slotNumber: 6, businessName: "Spa Reset", offer: "Reader-only chair massage", couponCode: "RESET", ctaText: "Relax", website: "example.com/spa", market: "Las Vegas", state: "NV", adMode: "template", template: "luxury" },
      { slotNumber: 7, businessName: "Dessert Walk", offer: "Buy one gelato, get one half off", couponCode: "SWEET", ctaText: "Find It", website: "example.com/dessert", market: "Las Vegas", state: "NV", adMode: "template", template: "coupon" },
      { slotNumber: 8, businessName: "After Hours Shuttle", offer: "Flat-rate ride zone", couponCode: "MOVE", ctaText: "Reserve", website: "example.com/shuttle", market: "Las Vegas", state: "NV", adMode: "template", template: "event" },
    ],
  },
  state: {
    nv: [
      { slotNumber: 1, businessName: "Nevada Weekend Guide", offer: "Local picks across Nevada", couponCode: "NVNOW", ctaText: "Explore", website: "example.com/nevada", market: "Nevada", state: "NV", adMode: "template", template: "vegas" },
    ],
  },
  global: [
    { slotNumber: 1, businessName: "Potty Favor Deals", offer: "National reader perks updated monthly", couponCode: "POTTY", ctaText: "Browse", website: "example.com/deals", market: "Global", adMode: "template", template: "coupon" },
    { slotNumber: 2, businessName: "Clean Break Coffee", offer: "15% off your first online order", couponCode: "BREAK15", ctaText: "Order", website: "example.com/coffee", market: "Global", adMode: "template", template: "family" },
    { slotNumber: 3, businessName: "Pocket Planner", offer: "Free event checklist download", couponCode: "PLAN", ctaText: "Download", website: "example.com/planner", market: "Global", adMode: "template", template: "contractor" },
    { slotNumber: 4, businessName: "Restroom Reader Club", offer: "Join for monthly prizes", couponCode: "READ", ctaText: "Join", website: "example.com/club", market: "Global", adMode: "template", template: "event" },
    { slotNumber: 5, businessName: "Snack Map", offer: "Find easy bites near you", couponCode: "SNACK", ctaText: "Open Map", website: "example.com/snacks", market: "Global", adMode: "template", template: "vegas" },
    { slotNumber: 6, businessName: "Freshen Up", offer: "Travel-size essentials bundle", couponCode: "FRESH", ctaText: "Shop", website: "example.com/fresh", market: "Global", adMode: "template", template: "luxury" },
    { slotNumber: 7, businessName: "Two-Minute Trivia", offer: "Play for a weekly reward", couponCode: "TRIVIA", ctaText: "Play", website: "example.com/trivia", market: "Global", adMode: "template", template: "coupon" },
    { slotNumber: 8, businessName: "Sponsor This Slot", offer: "Reach readers while they pause", couponCode: "", ctaText: "Reserve", website: "example.com/sponsor", market: "Global", adMode: "template", template: "event" },
  ],
};

const activeContext = { venue: null, qr: null, issue: null, contentSource: "demo", market: null, adTargetingSource: "placeholder", adsBySlot: new Map() };
const recordedAdImpressions = new Set();

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

function slugify(value) {
  return String(value || "").trim().toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function titleizeMarket(value) {
  return String(value || "").split("-").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function issueContent(issue) {
  if (!issue) return {};
  if (issue.content && typeof issue.content === "object") return issue.content;
  const blocks = Array.isArray(issue.contentBlocks) ? issue.contentBlocks : [];
  return {
    heroTitle: blocks[0],
    intro: blocks[1],
    article: blocks.slice(2).join("\n\n"),
    featuredTitle: issue.title,
  };
}

function publishedIssue(issue) {
  return issue && (!issue.status || issue.status === "published");
}

function normalizeIssueCollection(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.entries(value).map(([key, issue]) => ({ lookupKey: key, ...(issue || {}) }));
  return [];
}

function seedDemoNetworkIfMissing() {
  const venues = ensureArray(STORAGE_KEYS.venues);
  const qrLocations = ensureArray(STORAGE_KEYS.qrLocations);
  const issues = ensureArray(STORAGE_KEYS.issues);
  if (!venues.some((venue) => venue.id === "venue-mgm" || venue.slug === "mgm-grand-las-vegas")) saveJson(STORAGE_KEYS.venues, [...venues, ...DEMO_NETWORK.venues]);
  if (!qrLocations.some((qr) => qr.qrId === "ST-MGM-CASINO-M-001")) saveJson(STORAGE_KEYS.qrLocations, [...qrLocations, DEMO_NETWORK.qrLocations[0]]);
  const missingIssues = DEMO_NETWORK.issues.filter((demoIssue) => !issues.some((issue) => issue.id === demoIssue.id));
  if (missingIssues.length) saveJson(STORAGE_KEYS.issues, [...issues, ...missingIssues]);
  if (!readJson(STORAGE_KEYS.standardIssue, null)) saveJson(STORAGE_KEYS.standardIssue, DEMO_NETWORK.standardIssue);
  if (!readJson(STORAGE_KEYS.marketAds, null)) saveJson(STORAGE_KEYS.marketAds, DEMO_MARKET_ADS);
}

function eventId() {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function recordEvent(type, details = {}) {
  const event = {
    eventId: eventId(),
    type,
    venueSlug: activeContext.venue?.slug || params().get("venue") || "",
    qrId: activeContext.qr?.qrId || params().get("qr") || "",
    issueId: activeContext.issue?.id || "",
    content_source_used: activeContext.contentSource,
    ad_targeting_source_used: activeContext.adTargetingSource,
    market: activeContext.market?.city || activeContext.market?.label || "",
    adSlot: details.adSlot || "",
    campaignId: details.campaignId || "",
    timestamp: new Date().toISOString(),
    ...details,
  };
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
  if (!venueSlug) return null;
  return ensureArray(STORAGE_KEYS.venues).find((venue) => venue.slug === venueSlug || venue.id === venueSlug) || null;
}

function getActiveQr(venue) {
  const qrId = params().get("qr");
  if (!qrId) return null;
  return ensureArray(STORAGE_KEYS.qrLocations).find((qr) => qr.qrId === qrId && (!venue || qr.venueId === venue.id)) || null;
}

function detectUserMarketByIp() {
  // Future hook: integrate server-side IP geolocation here (for example, an edge function
  // that maps the request IP to city/state). Do not call paid IP APIs from the browser.
  return null;
}

function detectBrowserMarketPlaceholder() {
  const explicitCity = params().get("city") || params().get("market");
  if (explicitCity) return { city: slugify(explicitCity), label: titleizeMarket(explicitCity), source: "city" };
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const locale = navigator.language || "";
  if (/vegas|pacific|los_angeles/i.test(`${timezone} ${locale}`)) return { city: "las-vegas", state: "nv", label: "Las Vegas", source: "city" };
  return { city: "", state: "", label: "National Edition", source: "placeholder" };
}

function resolveMarket(venue, qr) {
  const ipMarket = detectUserMarketByIp();
  if (venue) return { city: slugify(venue.city), state: slugify(venue.state), label: `${venue.city}${venue.state ? `, ${venue.state}` : ""}`, source: qr ? "qr" : "venue" };
  if (ipMarket) return { ...ipMarket, city: slugify(ipMarket.city), state: slugify(ipMarket.state), source: "city" };
  return detectBrowserMarketPlaceholder();
}

function selectActiveIssue(venue, market) {
  const citySlug = market?.city || slugify(params().get("city"));
  const venueOverrides = normalizeIssueCollection(readJson(STORAGE_KEYS.venueIssueOverrides, []));
  const cityIssues = normalizeIssueCollection(readJson(STORAGE_KEYS.cityIssues, []));
  const legacyIssues = ensureArray(STORAGE_KEYS.issues);
  const standardIssue = readJson(STORAGE_KEYS.standardIssue, null);
  const venueMatch = venue && [...venueOverrides, ...legacyIssues].find((issue) => publishedIssue(issue) && (issue.venueId === venue.id || issue.venueSlug === venue.slug || issue.lookupKey === venue.slug || issue.venueName === venue.name));
  if (venueMatch) return { issue: venueMatch, source: "venue" };
  const cityMatch = [...cityIssues, ...legacyIssues].find((issue) => publishedIssue(issue) && !issue.venueId && (slugify(issue.city) === citySlug || issue.lookupKey === citySlug || slugify(issue.market) === citySlug || issue.issueType === "city" && slugify(issue.city) === citySlug));
  if (cityMatch) return { issue: cityMatch, source: "city" };
  if (publishedIssue(standardIssue)) return { issue: standardIssue, source: "standard" };
  return { issue: { id: "demo-fallback", title: "Potty Favor Demo Issue", month: "June", year: "2026", city: "National Edition", status: "published", issueType: "demo", content: DEFAULT_CONTENT }, source: "demo" };
}

function renderIssueSettings(settings = { ...DEFAULT_SETTINGS, ...readJson(STORAGE_KEYS.legacySettings, {}), ...readJson(STORAGE_KEYS.settings, {}) }) {
  const issue = activeContext.issue;
  const brandName = settings.logoText || settings.brand || settings.activeBrand || "Potty Favor";
  const issueMonthYear = issue?.month && issue?.year ? `${issue.month} ${issue.year}` : (issue?.monthYear || settings.monthYear);
  const marketLabel = activeContext.market?.label || issue?.city || settings.city || "National Edition";
  setText('[data-issue-field="brand"]', settings.activeBrand || brandName);
  document.querySelectorAll('[data-brand-title]').forEach((node) => {
    node.replaceChildren(document.createTextNode(brandName));
    const partner = document.createElement("span");
    partner.textContent = "/ Stall Talk";
    node.append(document.createTextNode(" "), partner);
  });
  setText('[data-issue-field="city"]', marketLabel);
  setText('[data-issue-field="venue"]', activeContext.venue?.name || (activeContext.contentSource === "venue" ? issue?.venueName : "Standard monthly issue"));
  setText('[data-issue-field="monthYear"]', issueMonthYear);
  setText('[data-issue-field="issueNumber"]', settings.issueNumber);
  document.querySelectorAll(".pf-tagline").forEach((tagline) => {
    tagline.textContent = "Scan. Read. Save.";
  });
  document.body.dataset.theme = settings.colorTheme || "clean-publication";
  document.body.dataset.contentSource = activeContext.contentSource;
  document.body.dataset.adSource = activeContext.adTargetingSource;
  document.title = `${brandName} · ${issueMonthYear}`;
}

function renderPublishedContent() {
  const merged = { ...DEFAULT_CONTENT, ...readJson(STORAGE_KEYS.published, {}), ...issueContent(activeContext.issue) };
  Object.entries(merged).forEach(([key, value]) => {
    const targets = document.querySelectorAll(`[data-content="${key}"]`);
    if (!targets.length || typeof value !== "string") return;
    targets.forEach((target) => {
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
  });
}

function adArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "object") return Object.values(value).flat();
  return [];
}

function mergeAdsBySlot(groups) {
  const bySlot = new Map();
  groups.flat().filter(Boolean).forEach((ad, index) => {
    const slot = String(ad.slotNumber || ad.slot || ad.selectedSlot || (index % 8) + 1);
    if (!bySlot.has(slot)) bySlot.set(slot, { ...ad, slotNumber: slot });
  });
  return bySlot;
}

function legacyAdsForMarket(source) {
  const venueId = activeContext.venue?.id;
  const marketCity = activeContext.market?.city;
  const marketState = activeContext.market?.state;
  const slots = readJson(STORAGE_KEYS.ads, []);
  const campaigns = ensureArray(STORAGE_KEYS.campaigns);
  const slotCampaigns = [];
  if (Array.isArray(slots)) {
    slots.forEach((slot) => {
      const campaign = campaigns.find((item) => item.id === (slot?.campaignId || slot?.campaignAssigned));
      if (campaign) slotCampaigns.push({ ...campaign, slotNumber: slot.slotNumber });
    });
  } else if (slots && typeof slots === "object") {
    Object.entries(slots).forEach(([slotNumber, ad]) => ad && slotCampaigns.push({ ...ad, slotNumber }));
  }
  const activeCampaigns = [...slotCampaigns, ...campaigns].filter((campaign) => !campaign.status || campaign.status === "active");
  return activeCampaigns.filter((campaign) => {
    const selectedSlots = campaign.selectedSlots || [campaign.slotNumber].filter(Boolean);
    if (!selectedSlots.length) return false;
    if (source === "venue") return !campaign.selectedVenues?.length || campaign.selectedVenues.includes(venueId);
    if (source === "city") return slugify(campaign.city || campaign.market) === marketCity;
    if (source === "state") return slugify(campaign.state || campaign.region) === marketState;
    return !campaign.selectedVenues?.length && !campaign.city && !campaign.state;
  }).flatMap((campaign) => (campaign.selectedSlots || [campaign.slotNumber]).map((slotNumber) => ({ ...campaign, slotNumber })));
}

function resolveAdSet() {
  const marketAds = readJson(STORAGE_KEYS.marketAds, DEMO_MARKET_ADS);
  const qrId = activeContext.qr?.qrId || params().get("qr");
  const venueSlug = activeContext.venue?.slug || params().get("venue");
  const citySlug = activeContext.market?.city || slugify(params().get("city"));
  const stateSlug = activeContext.market?.state;
  const priority = [
    { source: "qr", ads: adArray(marketAds.qr?.[qrId]) },
    { source: "venue", ads: [...adArray(marketAds.venue?.[venueSlug]), ...legacyAdsForMarket("venue")] },
    { source: "city", ads: [...adArray(marketAds.city?.[citySlug]), ...legacyAdsForMarket("city")] },
    { source: "state", ads: [...adArray(marketAds.state?.[stateSlug]), ...legacyAdsForMarket("state")] },
    { source: "global", ads: [...adArray(marketAds.global), ...legacyAdsForMarket("global")] },
  ];
  const chosen = priority.find((group) => group.ads.length);
  if (!chosen) return { source: "placeholder", adsBySlot: new Map() };
  const lowerGroups = priority.slice(priority.indexOf(chosen) + 1).map((group) => group.ads);
  const adsBySlot = mergeAdsBySlot([chosen.ads, ...lowerGroups]);
  return { source: chosen.source, adsBySlot };
}

function campaignForSlot(slotNumber) {
  return activeContext.adsBySlot.get(String(slotNumber)) || null;
}

function buildAdSlotBadge(slotNumber, ad) {
  const badge = document.createElement("span");
  badge.className = "ad-slot-badge";
  badge.textContent = `Ad Slot ${slotNumber} · ${ad?.businessName || ad?.advertiserName || "Sponsor"} · ${ad?.ctaText || ad?.ctaButtonText || "Tap"}`;
  return badge;
}

function placeholderText(slotNumber) {
  return { businessName: `Sponsor Slot ${slotNumber}`, offer: "Available for a clean, targeted reader offer.", ctaText: "Reserve slot" };
}

function resetAdCardMarkup(card, slotNumber) {
  card.classList.remove("pf-ad-card-generated");
  card.replaceChildren();
  const label = document.createElement("span");
  label.className = "ad-label";
  label.textContent = `Ad Slot ${slotNumber}`;
  const title = document.createElement("strong");
  title.textContent = `Sponsor Slot ${slotNumber}`;
  const copy = document.createElement("p");
  copy.textContent = "Available for a clean, targeted reader offer.";
  const link = document.createElement("a");
  link.href = `#ad-${slotNumber}`;
  link.textContent = "Reserve slot";
  card.append(label, title, copy, link);
}

function updateAdCard(card, slotNumber, ad) {
  const displayAd = ad || placeholderText(slotNumber);
  if (!ad && card.classList.contains("pf-ad-card-generated")) resetAdCardMarkup(card, slotNumber);
  card.dataset.campaignId = ad?.id || ad?.campaignId || "";
  card.dataset.coupon = ad?.couponCode || "";
  card.classList.toggle("pf-empty-ad", !ad);
  if (window.StallTalkGraphicAds && ad && (ad.headline || ad.businessName || window.StallTalkGraphicAds.imageSource(ad))) {
    const creative = window.StallTalkGraphicAds.build(ad, { slotNumber, compact: true });
    creative.append(buildAdSlotBadge(slotNumber, ad));
    card.classList.add("pf-ad-card-generated");
    card.replaceChildren(creative);
    recordAdImpressionOnce(slotNumber, card.dataset.campaignId);
    return;
  }
  card.classList.remove("pf-ad-card-generated");
  const label = card.querySelector(".ad-label");
  const title = card.querySelector("strong");
  const copy = card.querySelector("p");
  const link = card.querySelector("a");
  if (label) label.textContent = `Ad Slot ${slotNumber}`;
  if (title) title.textContent = displayAd.businessName || displayAd.advertiserName || displayAd.headline;
  if (copy) copy.textContent = displayAd.offer || displayAd.subheadline;
  if (link) {
    link.href = ad ? normalizeContactHref(ad?.website || ad?.phone || ad?.contact || ad?.contactUrl) : `#ad-${slotNumber}`;
    link.textContent = displayAd.ctaText || displayAd.ctaButtonText || "Reserve slot";
    link.setAttribute("aria-label", `View ${displayAd.businessName || displayAd.advertiserName || `Ad Slot ${slotNumber}`} offer`);
  }
  recordAdImpressionOnce(slotNumber, card.dataset.campaignId);
}

function updateMiniAd(card, slotNumber, ad) {
  const displayAd = ad || placeholderText(slotNumber);
  card.classList.toggle("pf-empty-ad", !ad);
  card.dataset.campaignId = ad?.id || ad?.campaignId || "";
  card.dataset.coupon = ad?.couponCode || "";
  const slot = card.querySelector("span");
  const title = card.querySelector("strong");
  const copy = card.querySelector("small");
  if (slot) slot.textContent = `Ad Slot ${slotNumber}`;
  if (title) title.textContent = displayAd.businessName || displayAd.advertiserName || displayAd.headline;
  if (copy) copy.textContent = displayAd.offer || displayAd.subheadline;
}

function renderAdSlots() {
  const resolved = resolveAdSet();
  activeContext.adTargetingSource = resolved.source;
  activeContext.adsBySlot = resolved.adsBySlot;
  for (let slotNumber = 1; slotNumber <= 8; slotNumber += 1) {
    const ad = campaignForSlot(slotNumber);
    document.querySelectorAll(`[data-ad="${slotNumber}"]`).forEach((card) => updateAdCard(card, slotNumber, ad));
    document.querySelectorAll(`[data-mini-ad="${slotNumber}"], #ad-${slotNumber}`).forEach((card) => updateMiniAd(card, slotNumber, ad));
    if (!document.querySelector(`[data-ad="${slotNumber}"], [data-mini-ad="${slotNumber}"]`)) recordAdImpressionOnce(slotNumber, ad?.id || ad?.campaignId || "");
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
      const couponCode = card?.dataset.coupon || "";
      recordEvent("ad_click", { adSlot: slot, campaignId, couponCode });
      if (couponCode) recordEvent("coupon_click", { adSlot: slot, campaignId, couponCode });
      link.classList.add("was-tapped");
      window.setTimeout(() => link.classList.remove("was-tapped"), 500);
    });
  });
}

function refreshIssue() {
  activeContext.venue = getActiveVenue();
  activeContext.qr = getActiveQr(activeContext.venue);
  activeContext.market = resolveMarket(activeContext.venue, activeContext.qr);
  const selectedIssue = selectActiveIssue(activeContext.venue, activeContext.market);
  activeContext.issue = selectedIssue.issue;
  activeContext.contentSource = selectedIssue.source;
  renderAdSlots();
  renderIssueSettings();
  renderPublishedContent();
  wireTapFeedback();
}

seedDemoNetworkIfMissing();
wireArticleExpansionLabels();
refreshIssue();
recordEvent("issue_view", { content_source_used: activeContext.contentSource, ad_targeting_source_used: activeContext.adTargetingSource });
if (params().get("venue") || params().get("qr")) {
  recordEvent("qr_scan");
  updateQrScanCount();
}

window.addEventListener("storage", (event) => {
  if ([STORAGE_KEYS.published, STORAGE_KEYS.ads, STORAGE_KEYS.settings, STORAGE_KEYS.venues, STORAGE_KEYS.issues, STORAGE_KEYS.campaigns, STORAGE_KEYS.standardIssue, STORAGE_KEYS.cityIssues, STORAGE_KEYS.venueIssueOverrides, STORAGE_KEYS.marketAds].includes(event.key)) {
    refreshIssue();
  }
});
