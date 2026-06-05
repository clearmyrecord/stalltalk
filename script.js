const STORAGE_KEYS = {
  issue: "pottyfavor_issue",
  venues: "pottyfavor_venues",
  ads: "pottyfavor_ads",
  settings: "pottyfavor_settings",
  analytics: "pottyfavor_analytics",
  oldIssue: "stalltalk_standard_issue",
  oldAds: "stalltalk_ad_slots",
  oldVenues: "stalltalk_venues",
};

const DEFAULT_DEMO = {
  issue: {
    issueMonthYear: "June 2026",
    mastheadBrand: "Potty Favor",
    missionText: "Our mission is to inspire, inform, educate, and entertain humanity — all from the comfort of your very own stall.",
    humorTitle: "Hilariously Funny",
    humorBody: "A restroom reader walks into a stall and says, ‘I only have two minutes.’ The magazine replies, ‘Perfect. That is exactly what I was built for.’",
    mainFeatureTitle: "How It All Started",
    mainFeatureBody: "Potty Favor began as a simple one-page publication: a big masthead, useful stories, jokes, trivia, quotes, a calendar, and sponsor messages placed around the content.\n\nThe Phase 1 product keeps that idea intact. Every venue receives the same monthly issue, while sponsor slots can still adapt by venue, city, or state.",
    secondaryFeatureTitle: "The History of Box Chairs",
    secondaryFeatureBody: "Great product ideas are often simple enough to explain quickly. Box Chairs were portable, useful, and memorable — exactly the kind of story that belongs in a short restroom publication.\n\nThe lesson is practical: turn small pauses into useful attention, and give readers something worth remembering before they leave.",
    wordOfTheDay: "transmute",
    wordDefinition: "verb — to change from one nature or form into another.",
    quotes: ["Great minds discuss ideas; average minds discuss events; small minds discuss people. — Eleanor Roosevelt", "Success is not final, failure is not fatal: it is the courage to continue that counts. — Winston Churchill"],
    didYouKnow: ["Rice paper contains no rice grain or rice.", "French fries originated in Belgium.", "The funny bone is a nerve, not a bone."],
    noWay: ["The most impossible item to flush is a ping pong ball.", "Separate cubicles for toilets are a relatively modern invention."],
    calendarText: "Register your event, promote your city, and keep the monthly calendar moving.",
  },
  venues: [{ name: "Demo Venue", city: "Las Vegas", state: "NV", slug: "demo-venue" }],
  ads: [],
  settings: { qrBaseUrl: "https://clearmyrecord.github.io/stalltalk/index.html" },
};

const pageContext = {
  venueSlug: new URLSearchParams(window.location.search).get("venue") || "",
  venue: null,
  market: null,
  issue: null,
  ads: [],
  renderedSlots: new Set(),
};

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

function normalizeText(value) {
  return String(value || "").trim();
}

function slugify(value) {
  return normalizeText(value).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function splitLines(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return normalizeText(value).split(/\n+/).map((line) => line.trim()).filter(Boolean);
}

async function loadDemoData() {
  try {
    const response = await fetch("data/demo.json", { cache: "no-store" });
    if (response.ok) return { ...DEFAULT_DEMO, ...(await response.json()) };
  } catch (error) {
    console.warn("Using embedded demo data because data/demo.json could not be loaded.", error);
  }
  return DEFAULT_DEMO;
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

function detectUserMarketByIp() {
  return Promise.resolve({ city: "", state: "", source: "future-ip-hook" });
}

function recordAnalytics(type, details = {}) {
  const events = readJson(STORAGE_KEYS.analytics, []);
  events.push({ type, details, venue: pageContext.venueSlug || null, at: new Date().toISOString() });
  saveJson(STORAGE_KEYS.analytics, events.slice(-500));
}

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = normalizeText(value);
  });
}

function setRichParagraphs(selector, value) {
  document.querySelectorAll(selector).forEach((element) => {
    element.innerHTML = "";
    splitLines(value).forEach((line) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = line;
      element.appendChild(paragraph);
    });
  });
}

function setList(selector, items, ordered = false) {
  document.querySelectorAll(selector).forEach((list) => {
    list.innerHTML = "";
    splitLines(items).forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });
    list.setAttribute("role", ordered ? "list" : "list");
  });
}

function renderIssue(issue) {
  pageContext.issue = issue;
  Object.entries(issue).forEach(([key, value]) => {
    if (["mainFeatureBody", "secondaryFeatureBody"].includes(key)) setRichParagraphs(`[data-field="${key}"]`, value);
    else if (!Array.isArray(value)) setText(`[data-field="${key}"]`, value);
  });
  setList('[data-list="quotes"]', issue.quotes);
  setList('[data-list="didYouKnow"]', issue.didYouKnow, true);
  setList('[data-list="noWay"]', issue.noWay);
  setText("[data-year]", new Date().getFullYear());
  const days = document.querySelector(".calendar-grid");
  if (days && !days.children.length) {
    for (let day = 1; day <= 35; day += 1) {
      const cell = document.createElement("span");
      cell.textContent = day <= 31 ? day : "";
      days.appendChild(cell);
    }
  }
}

function resolveVenue(venues) {
  const venue = venues.find((item) => slugify(item.slug || item.name) === pageContext.venueSlug) || null;
  pageContext.venue = venue;
  pageContext.market = venue ? { city: venue.city || "", state: venue.state || "" } : { city: "", state: "" };
  if (pageContext.venueSlug) recordAnalytics("qr_scan", { venueSlug: pageContext.venueSlug, matched: Boolean(venue) });
}

function normalizeAd(ad) {
  return {
    slot: Number(ad.slot || ad.slotNumber || 1),
    advertiserName: ad.advertiserName || ad.businessName || "Potty Favor Sponsor",
    headline: ad.headline || ad.offer || "Sponsor Message",
    offer: ad.offer || "A reader-only local offer.",
    couponCode: ad.couponCode || "",
    cta: ad.cta || ad.ctaText || "Learn More",
    targetUrl: ad.targetUrl || ad.website || "#",
    image: ad.image || ad.imageUrl || ad.imageBase64 || "",
    targetingType: ad.targetingType || "global",
    market: ad.market || ad.selectedMarket || ad.venueSlug || ad.city || ad.state || "",
    active: ad.active !== false,
  };
}

function adRank(ad) {
  const type = normalizeText(ad.targetingType).toLowerCase();
  const market = normalizeText(ad.market).toLowerCase();
  const venueSlug = normalizeText(pageContext.venueSlug).toLowerCase();
  const city = normalizeText(pageContext.market?.city).toLowerCase();
  const state = normalizeText(pageContext.market?.state).toLowerCase();
  if (type === "venue" && market === venueSlug) return 1;
  if (type === "city" && market === city) return 2;
  if (type === "state" && market === state) return 3;
  if (type === "ip") return 4;
  if (type === "global") return 5;
  return 99;
}

function selectAdForSlot(slot, ads) {
  const matches = ads.filter((ad) => ad.active && Number(ad.slot) === Number(slot)).sort((a, b) => adRank(a) - adRank(b));
  return matches.find((ad) => adRank(ad) < 99) || null;
}

function renderAdElement(element, ad, slot) {
  if (!ad) {
    element.className = `${element.className} is-empty`;
    element.innerHTML = `<span class="slot">Ad Slot ${slot}</span><h3>Available</h3><p>Reserve this Potty Favor placement.</p><a href="admin/">Book Slot</a>`;
    return;
  }
  element.classList.remove("is-empty");
  element.innerHTML = `
    <span class="slot">Ad Slot ${slot} · ${ad.targetingType}</span>
    ${ad.image ? `<img src="${ad.image}" alt="${ad.advertiserName} ad image" />` : ""}
    <h3>${ad.headline}</h3>
    <p><strong>${ad.advertiserName}</strong></p>
    <p>${ad.offer}</p>
    ${ad.couponCode ? `<button class="coupon" type="button" data-coupon="${ad.couponCode}">Code: ${ad.couponCode}</button>` : ""}
    <a href="${ad.targetUrl}" target="_blank" rel="noopener" data-ad-click>${ad.cta}</a>`;
  if (!pageContext.renderedSlots.has(slot)) {
    pageContext.renderedSlots.add(slot);
    recordAnalytics("ad_impression", { slot, advertiserName: ad.advertiserName, targetingType: ad.targetingType });
  }
}

function renderAds(ads) {
  pageContext.ads = ads.map(normalizeAd);
  document.querySelectorAll("[data-ad-slot]").forEach((element) => {
    const slot = Number(element.dataset.adSlot);
    renderAdElement(element, selectAdForSlot(slot, pageContext.ads), slot);
  });
}

function bindClicks() {
  document.addEventListener("click", (event) => {
    const adLink = event.target.closest("[data-ad-click]");
    if (adLink) {
      const card = adLink.closest("[data-ad-slot]");
      recordAnalytics("ad_click", { slot: Number(card?.dataset.adSlot), href: adLink.href });
    }
    const coupon = event.target.closest("[data-coupon]");
    if (coupon) {
      const card = coupon.closest("[data-ad-slot]");
      recordAnalytics("coupon_click", { slot: Number(card?.dataset.adSlot), couponCode: coupon.dataset.coupon });
    }
  });
}

async function init() {
  migrateOldKeys();
  const demo = await loadDemoData();
  const issue = { ...demo.issue, ...readJson(STORAGE_KEYS.issue, {}) };
  const venues = readJson(STORAGE_KEYS.venues, demo.venues);
  const ads = readJson(STORAGE_KEYS.ads, demo.ads);
  renderIssue(issue);
  resolveVenue(venues);
  await detectUserMarketByIp();
  renderAds(ads.length ? ads : demo.ads);
  recordAnalytics("issue_view", { issueMonthYear: issue.issueMonthYear, venueSlug: pageContext.venueSlug || null });
  bindClicks();
}

document.addEventListener("DOMContentLoaded", init);
