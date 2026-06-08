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

const API_BASE =
  localStorage.getItem("pottyFavorApiBase") ||
  "https://stalltalk.vercel.app";

const DEFAULT_DEMO = {
  issue: {
    issueMonthYear: "June 2026",
    mastheadBrand: "Potty Favor",
    missionText:
      "Our mission is to inspire, inform, educate, and entertain humanity — all from the comfort of your very own stall.",
    humorTitle: "Hilariously Funny",
    humorBody:
      "A restroom reader walks into a stall and says, ‘I only have two minutes.’ The magazine replies, ‘Perfect. That is exactly what I was built for.’",
    mainFeatureTitle: "How It All Started",
    mainFeatureBody:
      "Potty Favor began as a simple one-page publication: a big masthead, useful stories, jokes, trivia, quotes, a calendar, and sponsor messages placed around the content.\n\nThe Phase 1 product keeps that idea intact. Every venue receives the same monthly issue, while sponsor slots can still adapt by venue, city, or state.",
    secondaryFeatureTitle: "The History of Box Chairs",
    secondaryFeatureBody:
      "Great product ideas are often simple enough to explain quickly. Box Chairs were portable, useful, and memorable — exactly the kind of story that belongs in a short restroom publication.\n\nThe lesson is practical: turn small pauses into useful attention, and give readers something worth remembering before they leave.",
    wordOfTheDay: "transmute",
    wordDefinition: "verb — to change from one nature or form into another.",
    quotes: [
      "Great minds discuss ideas; average minds discuss events; small minds discuss people. — Eleanor Roosevelt",
      "Success is not final, failure is not fatal: it is the courage to continue that counts. — Winston Churchill",
    ],
    didYouKnow: [
      "Rice paper contains no rice grain or rice.",
      "French fries originated in Belgium.",
      "The funny bone is a nerve, not a bone.",
    ],
    calendarText:
      "Register your event, promote your city, and keep the monthly calendar moving.",
  },

  venues: [
    {
      name: "Demo Venue",
      city: "Las Vegas",
      state: "NV",
      slug: "demo-venue",
    },
  ],

  ads: [],

  events: [
    {
      id: "demo-rooftop-happy-hour",
      title: "Rooftop Happy Hour",
      description:
        "Sunset drink specials and skyline views for Las Vegas locals and visitors.",
      venueName: "Neon Sky Lounge",
      address: "300 Las Vegas Blvd S",
      city: "Las Vegas",
      state: "NV",
      eventDate: "2026-06-12",
      startTime: "17:00",
      endTime: "19:00",
      category: "Nightlife",
      website: "https://example.com/rooftop",
      phone: "",
      submittedByName: "Potty Favor Demo",
      submittedByEmail: "demo@pottyfavor.com",
      status: "approved",
      featured: true,
      createdAt: "2026-06-01T12:00:00.000Z",
      updatedAt: "2026-06-01T12:00:00.000Z",
    },
    {
      id: "demo-live-music-night",
      title: "Live Music Night",
      description: "Local bands take the stage for a reader-friendly night out.",
      venueName: "Fremont Room",
      address: "425 Fremont St",
      city: "Las Vegas",
      state: "NV",
      eventDate: "2026-06-18",
      startTime: "20:00",
      endTime: "23:00",
      category: "Concert",
      website: "https://example.com/live-music",
      phone: "",
      submittedByName: "Potty Favor Demo",
      submittedByEmail: "demo@pottyfavor.com",
      status: "approved",
      featured: false,
      createdAt: "2026-06-01T12:00:00.000Z",
      updatedAt: "2026-06-01T12:00:00.000Z",
    },
    {
      id: "demo-local-comedy-showcase",
      title: "Local Comedy Showcase",
      description:
        "Fast sets from Vegas comedians built for a fun weekend warmup.",
      venueName: "Arts District Comedy Cellar",
      address: "1020 S Main St",
      city: "Las Vegas",
      state: "NV",
      eventDate: "2026-06-25",
      startTime: "19:30",
      endTime: "21:30",
      category: "Community",
      website: "https://example.com/comedy",
      phone: "",
      submittedByName: "Potty Favor Demo",
      submittedByEmail: "demo@pottyfavor.com",
      status: "approved",
      featured: false,
      createdAt: "2026-06-01T12:00:00.000Z",
      updatedAt: "2026-06-01T12:00:00.000Z",
    },
  ],

  pendingEvents: [],

  settings: {
    qrBaseUrl: "https://clearmyrecord.github.io/stalltalk/index.html",
  },
};

const pageContext = {
  urlParams: new URLSearchParams(window.location.search),
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
  return normalizeText(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function splitLines(value) {
  if (Array.isArray(value)) return value.filter(Boolean);

  return normalizeText(value)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function loadDemoData() {
  try {
    const response = await fetch("data/demo.json", { cache: "no-store" });

    if (response.ok) {
      return {
        ...DEFAULT_DEMO,
        ...(await response.json()),
      };
    }
  } catch (error) {
    console.warn(
      "Using embedded demo data because data/demo.json could not be loaded.",
      error
    );
  }

  return DEFAULT_DEMO;
}

async function fetchPublishedJson(path) {
  try {
    const response = await fetch(`${path}?v=${Date.now()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      console.info(`No shared publication loaded from ${path}: ${response.status}`);
      return null;
    }

    const payload = await response.json();
    console.info(`Loaded shared publication data from ${path}.`);
    return payload;
  } catch (error) {
    console.info(
      `Falling back because shared publication data could not be loaded from ${path}.`,
      error
    );
    return null;
  }
}

function extractIssuePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  return payload.issue && typeof payload.issue === "object"
    ? payload.issue
    : payload;
}

function extractAdsPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.ads)) return payload.ads;
  return null;
}

async function loadSharedPublication() {
  const [issuePayload, adsPayload] = await Promise.all([
    fetchPublishedJson("data/published-issue.json"),
    fetchPublishedJson("data/published-ads.json"),
  ]);

  return {
    issue: extractIssuePayload(issuePayload),
    ads: extractAdsPayload(adsPayload),
  };
}

function migrateOldKeys() {
  if (!localStorage.getItem(STORAGE_KEYS.issue)) {
    const oldIssue = readJson(STORAGE_KEYS.oldIssue, null);

    if (oldIssue && typeof oldIssue === "object") {
      saveJson(
        STORAGE_KEYS.issue,
        oldIssue.issue || oldIssue.content || oldIssue
      );
    }
  }

  if (!localStorage.getItem(STORAGE_KEYS.venues)) {
    const oldVenues = readJson(STORAGE_KEYS.oldVenues, null);
    if (Array.isArray(oldVenues)) saveJson(STORAGE_KEYS.venues, oldVenues);
  }

  if (!localStorage.getItem(STORAGE_KEYS.ads)) {
    const oldAds =
      readJson(STORAGE_KEYS.oldAds, null) ||
      readJson(STORAGE_KEYS.marketAds, null);

    if (Array.isArray(oldAds)) saveJson(STORAGE_KEYS.ads, oldAds);
  }

  if (!localStorage.getItem(STORAGE_KEYS.events)) {
    const oldEvents = readJson(STORAGE_KEYS.oldEvents, null);
    if (Array.isArray(oldEvents)) saveJson(STORAGE_KEYS.events, oldEvents);
  }

  if (!localStorage.getItem(STORAGE_KEYS.pendingEvents)) {
    const oldPendingEvents = readJson(STORAGE_KEYS.oldPendingEvents, null);

    if (Array.isArray(oldPendingEvents)) {
      saveJson(STORAGE_KEYS.pendingEvents, oldPendingEvents);
    }
  }
}

function detectUserMarketByIp() {
  return Promise.resolve({
    city: "",
    state: "",
    source: "future-ip-hook",
  });
}

function recordAnalytics(type, details = {}) {
  const events = readJson(STORAGE_KEYS.analytics, []);

  events.push({
    type,
    details,
    venue: pageContext.venueSlug || null,
    at: new Date().toISOString(),
  });

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

function parseIssueMonth(issueMonthYear) {
  const fallback = new Date();

  const fallbackLabel = fallback.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const parsed = new Date(`${normalizeText(issueMonthYear) || fallbackLabel} 1`);

  return Number.isNaN(parsed.getTime())
    ? {
        month: fallback.getMonth(),
        year: fallback.getFullYear(),
      }
    : {
        month: parsed.getMonth(),
        year: parsed.getFullYear(),
      };
}

function formatDate(value) {
  if (!value) return "Date TBD";

  const date = new Date(`${value}T12:00:00`);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
}

function formatTimeRange(event) {
  const start = normalizeText(event.startTime);
  const end = normalizeText(event.endTime);

  if (!start && !end) return "Time TBD";

  return end ? `${start}–${end}` : start;
}

function normalizeEvent(event) {
  const now = new Date().toISOString();

  return {
    id: normalizeText(event.id) || `event-${Date.now()}`,
    title: normalizeText(event.title),
    description: normalizeText(event.description),
    venueName: normalizeText(event.venueName),
    address: normalizeText(event.address),
    city: normalizeText(event.city),
    state: normalizeText(event.state).toUpperCase(),
    eventDate: normalizeText(event.eventDate),
    startTime: normalizeText(event.startTime),
    endTime: normalizeText(event.endTime),
    category: normalizeText(event.category) || "Other",
    website: normalizeText(event.website),
    phone: normalizeText(event.phone),
    submittedByName: normalizeText(event.submittedByName),
    submittedByEmail: normalizeText(event.submittedByEmail),
    status: normalizeText(event.status) || "pending",
    featured: Boolean(event.featured),
    createdAt: normalizeText(event.createdAt) || now,
    updatedAt: normalizeText(event.updatedAt) || now,
  };
}

function approvedEventsForIssue(events, issue) {
  const { month, year } = parseIssueMonth(issue.issueMonthYear);

  return events
    .map(normalizeEvent)
    .filter((event) => {
      const date = new Date(`${event.eventDate}T12:00:00`);

      return (
        event.status === "approved" &&
        !Number.isNaN(date.getTime()) &&
        date.getMonth() === month &&
        date.getFullYear() === year
      );
    })
    .sort((a, b) =>
      `${a.eventDate} ${a.startTime}`.localeCompare(
        `${b.eventDate} ${b.startTime}`
      )
    );
}

function eventCard(event, compact = false) {
  const article = document.createElement("article");
  article.className = compact ? "event-card compact" : "event-card";

  const title = document.createElement("h3");
  title.textContent = event.title;

  const meta = document.createElement("p");
  meta.className = "event-meta";
  meta.textContent = `${event.venueName} · ${formatDate(
    event.eventDate
  )} · ${formatTimeRange(event)} · ${event.city}, ${event.state}`;

  const description = document.createElement("p");
  description.textContent =
    event.description || `${event.category} event at ${event.venueName}.`;

  article.append(title, meta, description);

  if (event.website) {
    const link = document.createElement("a");
    link.href = event.website;
    link.target = "_blank";
    link.rel = "noopener";
    link.dataset.eventClick = event.id;
    link.textContent = "Event details";
    article.appendChild(link);
  }

  return article;
}

function showEventsForDay(events, day) {
  const details = document.querySelector("#event-details");
  if (!details) return;

  details.innerHTML = "";

  const dayEvents = events.filter(
    (event) => Number(event.eventDate.slice(-2)) === Number(day)
  );

  if (!dayEvents.length) return;

  const heading = document.createElement("h3");
  heading.textContent = `Events on ${formatDate(dayEvents[0].eventDate)}`;
  details.appendChild(heading);

  dayEvents.forEach((event) => details.appendChild(eventCard(event, true)));
}

function renderCalendarEvents(issue, events) {
  const grid = document.querySelector(".calendar-grid");
  if (!grid) return;

  const approved = approvedEventsForIssue(events, issue);
  const { month, year } = parseIssueMonth(issue.issueMonthYear);
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const byDay = new Map();

  approved.forEach((event) => {
    const day = Number(event.eventDate.slice(-2));
    byDay.set(day, [...(byDay.get(day) || []), event]);
  });

  grid.innerHTML = "";

  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((name) => {
    const cell = document.createElement("span");
    cell.className = "calendar-weekday";
    cell.textContent = name;
    grid.appendChild(cell);
  });

  for (let slot = 0; slot < firstDay; slot += 1) {
    grid.appendChild(document.createElement("span"));
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const cell = document.createElement(byDay.has(day) ? "button" : "span");
    cell.className = byDay.has(day) ? "has-event" : "";
    cell.textContent = day;

    if (byDay.has(day)) {
      cell.type = "button";
      cell.title = byDay
        .get(day)
        .map((event) => event.title)
        .join(", ");

      cell.addEventListener("click", () => showEventsForDay(approved, day));
    }

    grid.appendChild(cell);
  }

  const spotlight = document.querySelector("#event-spotlight");
  const details = document.querySelector("#event-details");

  if (spotlight) {
    spotlight.innerHTML = "";

    const featured = approved.find((event) => event.featured) || approved[0];

    const heading = document.createElement("h3");
    heading.textContent = "Event Spotlight";
    spotlight.appendChild(heading);

    if (featured) {
      spotlight.appendChild(eventCard(featured));
    } else {
      const copy = document.createElement("p");
      copy.textContent =
        issue.calendarText ||
        "Register your event free and discover local happenings all month.";
      spotlight.appendChild(copy);
    }
  }

  if (details) {
    details.innerHTML = "";
    approved.slice(0, 3).forEach((event) => {
      details.appendChild(eventCard(event, true));
    });
  }
}

function collectPublicEvent(form) {
  const data = new FormData(form);
  const now = new Date().toISOString();

  return normalizeEvent({
    id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
    status: "pending",
    featured: false,
    createdAt: now,
    updatedAt: now,
  });
}

function validateEvent(event) {
  return [
    "title",
    "venueName",
    "city",
    "state",
    "eventDate",
    "submittedByEmail",
  ].filter((key) => !normalizeText(event[key]));
}

function bindEventSubmission() {
  const form = document.querySelector("#public-event-form");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const status = document.querySelector("#public-event-status");
    const submission = collectPublicEvent(form);
    const missing = validateEvent(submission);

    if (missing.length) {
      status.textContent = `Please complete: ${missing.join(", ")}.`;
      status.classList.add("error");
      return;
    }

    const pending = readJson(STORAGE_KEYS.pendingEvents, []);
    pending.push(submission);

    saveJson(STORAGE_KEYS.pendingEvents, pending);
    saveJson(STORAGE_KEYS.oldPendingEvents, pending);

    recordAnalytics("event_submission", {
      id: submission.id,
      title: submission.title,
      city: submission.city,
      state: submission.state,
      futureBackendHook: true,
    });

    form.reset();

    status.classList.remove("error");
    status.textContent =
      "Event submitted. Admin approval required before publication.";
  });
}

function renderIssue(issue) {
  pageContext.issue = issue;

  Object.entries(issue).forEach(([key, value]) => {
    if (["mainFeatureBody", "secondaryFeatureBody"].includes(key)) {
      setRichParagraphs(`[data-field="${key}"]`, value);
    } else if (!Array.isArray(value)) {
      setText(`[data-field="${key}"]`, value);
    }
  });

  setList('[data-list="quotes"]', issue.quotes);
  setList('[data-list="didYouKnow"]', issue.didYouKnow, true);
  setText("[data-year]", new Date().getFullYear());
}

function resolveVenue(venues) {
  const venue =
    venues.find((item) => slugify(item.slug || item.name) === pageContext.venueSlug) ||
    null;

  pageContext.venue = venue;

  pageContext.market = venue
    ? {
        city: venue.city || "",
        state: venue.state || "",
      }
    : {
        city: "",
        state: "",
      };

  if (pageContext.venueSlug) {
    recordAnalytics("qr_scan", {
      venueSlug: pageContext.venueSlug,
      matched: Boolean(venue),
    });
  }
}

/* ==================================================
   STANDARDIZED AD + AI GENERATED AD HELPERS
   ================================================== */

function imageSource(ad) {
  const direct = normalizeText(ad.image || ad.imageUrl || ad.imageAdUrl);
  const base64 = normalizeText(ad.imageBase64 || ad.imageAdBase64 || ad.b64_json);

  if (direct) return direct;

  return base64
    ? base64.startsWith("data:")
      ? base64
      : `data:image/png;base64,${base64}`
    : "";
}

function normalizeAd(ad) {
  const image = imageSource(ad);

  return {
    slot: Number(ad.slot || ad.slotNumber || 1),
    advertiserName:
      ad.advertiserName ||
      ad.businessName ||
      ad.sponsorName ||
      "Potty Favor Sponsor",
    headline: ad.headline || ad.offer || "Sponsor Message",
    offer: ad.offer || "A reader-only local offer.",
    couponCode: ad.couponCode || "",
    cta: ad.cta || ad.ctaText || ad.ctaButtonText || ad.callToAction || "Learn More",
    targetUrl: ad.targetUrl || ad.website || "#",
    image,
    imageBase64: ad.imageBase64 || "",
    targetingType: ad.targetingType || "global",
    market: ad.market || ad.selectedMarket || ad.venueSlug || ad.city || ad.state || "",
    city: ad.city || "",
    state: ad.state || "",
    category: ad.category || "Local Business",
    tone: ad.tone || "bold, premium, clean, high-converting",
    active: ad.active !== false,
    adMode: ad.adMode || (image ? "image" : "copy"),
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
  const matches = ads
    .filter((ad) => ad.active && Number(ad.slot) === Number(slot))
    .sort((a, b) => adRank(a) - adRank(b));

  return matches.find((ad) => adRank(ad) < 99) || null;
}

function getAdSlot(slot) {
  return document.querySelector(`[data-ad-slot="${slot}"]`);
}

function showAdLoading(slot) {
  const element = getAdSlot(slot);
  if (!element) return;

  element.classList.remove("is-empty");
  element.innerHTML = `
    <div class="ad-loading">
      Generating agency-quality ad...
    </div>
  `;
}

function showAdError(slot, message) {
  const element = getAdSlot(slot);
  if (!element) return;

  element.classList.remove("is-empty");
  element.innerHTML = `
    <div class="ad-error">
      <strong>Ad generation failed.</strong>
      <span>${message || "Unknown error"}</span>
    </div>
  `;
}

function renderGeneratedAd(slot, result) {
  const element = getAdSlot(slot);
  if (!element) return;

  const metadata = result.metadata || {};
  const imageBase64 = result.imageBase64 || result.b64_json || "";
  const imageUrl =
    result.imageUrl ||
    result.url ||
    (imageBase64
      ? imageBase64.startsWith("data:")
        ? imageBase64
        : `data:image/png;base64,${imageBase64}`
      : "");

  const sponsorName =
    metadata.sponsorName ||
    metadata.advertiserName ||
    result.sponsorName ||
    "Local Sponsor";

  const offer =
    metadata.offer ||
    result.offer ||
    metadata.headline ||
    "Featured Local Offer";

  const city =
    metadata.city ||
    pageContext.market?.city ||
    "Las Vegas";

  const category =
    metadata.category ||
    result.category ||
    "Local Business";

  const callToAction =
    metadata.callToAction ||
    metadata.cta ||
    result.callToAction ||
    "Scan to Learn More";

  element.classList.remove("is-empty");

  element.innerHTML = `
    <div class="generated-ad" style="${imageUrl ? `background-image: url('${imageUrl}')` : ""}">
      <div class="generated-ad-content">
        <div class="generated-ad-sponsor">${sponsorName}</div>
        <h3>${offer}</h3>
        <p>${city} · ${category}</p>
        <a class="generated-ad-cta" href="#">${callToAction}</a>
      </div>
    </div>
  `;

  recordAnalytics("ai_ad_rendered", {
    slot,
    sponsorName,
    offer,
    city,
    category,
  });
}

async function generateAdImage(payload) {
  const slot = Number(payload.slot || 1);

  showAdLoading(slot);

  try {
    const response = await fetch(`${API_BASE}/api/generate-ad-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `${response.status} ${response.statusText}`);
    }

    renderGeneratedAd(slot, data);
    return data;
  } catch (error) {
    showAdError(slot, error.message);
    throw error;
  }
}

async function generateAdVideo(payload) {
  const slot = Number(payload.slot || 1);

  try {
    const response = await fetch(`${API_BASE}/api/generate-ad-video`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `${response.status} ${response.statusText}`);
    }

    recordAnalytics("ai_video_ad_requested", {
      slot,
      sponsorName: payload.sponsorName || payload.advertiserName || "",
    });

    return data;
  } catch (error) {
    console.warn("Video ad generation unavailable.", error);
    throw error;
  }
}

function renderEmptyAdElement(element, slot) {
  element.classList.add("is-empty");

  element.innerHTML = `
    <span class="slot">Ad Slot ${slot} · Sponsor Opportunity</span>
    <h3>Available Sponsor Slot</h3>
    <div class="ad-copy">
      <p><strong>Advertise Here</strong></p>
      <p>Reach restroom readers in this venue.</p>
    </div>
    <div class="ad-actions">
      <a href="admin/">Book Slot</a>
    </div>
  `;
}

function renderAdElement(element, ad, slot) {
  if (!ad) {
    renderEmptyAdElement(element, slot);
    return;
  }

  element.classList.remove("is-empty");

  const image = ad.image || "";
  const safeTargetUrl = ad.targetUrl || "#";

  if (image) {
    element.innerHTML = `
      <div class="generated-ad" style="background-image: url('${image}')">
        <div class="generated-ad-content">
          <div class="generated-ad-sponsor">${ad.advertiserName}</div>
          <h3>${ad.headline}</h3>
          <p>${ad.offer}</p>
          <a class="generated-ad-cta" href="${safeTargetUrl}" target="_blank" rel="noopener" data-ad-click>
            ${ad.cta}
          </a>
        </div>
      </div>
    `;
  } else {
    element.innerHTML = `
      <span class="slot">Ad Slot ${slot} · ${ad.targetingType}</span>
      <h3>${ad.headline}</h3>
      <div class="ad-copy">
        <p><strong>${ad.advertiserName}</strong></p>
        <p>${ad.offer}</p>
      </div>
      <div class="ad-actions">
        ${
          ad.couponCode
            ? `<button class="coupon" type="button" data-coupon="${ad.couponCode}">Code: ${ad.couponCode}</button>`
            : ""
        }
        <a href="${safeTargetUrl}" target="_blank" rel="noopener" data-ad-click>
          ${ad.cta}
        </a>
      </div>
    `;
  }

  if (!pageContext.renderedSlots.has(slot)) {
    pageContext.renderedSlots.add(slot);

    recordAnalytics("ad_impression", {
      slot,
      advertiserName: ad.advertiserName,
      targetingType: ad.targetingType,
    });
  }
}

function renderAds(ads) {
  pageContext.ads = ads.map(normalizeAd);

  document.querySelectorAll("[data-ad-slot]").forEach((element) => {
    const slot = Number(element.dataset.adSlot);
    const ad = selectAdForSlot(slot, pageContext.ads);

    renderAdElement(element, ad, slot);
  });
}

function bindClicks() {
  document.addEventListener("click", (event) => {
    const adLink = event.target.closest("[data-ad-click]");

    if (adLink) {
      const card = adLink.closest("[data-ad-slot]");

      recordAnalytics("ad_click", {
        slot: Number(card?.dataset.adSlot),
        href: adLink.href,
      });
    }

    const coupon = event.target.closest("[data-coupon]");

    if (coupon) {
      const card = coupon.closest("[data-ad-slot]");

      recordAnalytics("coupon_click", {
        slot: Number(card?.dataset.adSlot),
        couponCode: coupon.dataset.coupon,
      });
    }

    const eventLink = event.target.closest("[data-event-click]");

    if (eventLink) {
      recordAnalytics("event_click", {
        id: eventLink.dataset.eventClick,
        href: eventLink.href,
      });
    }
  });
}

async function init() {
  migrateOldKeys();

  const demo = await loadDemoData();
  const localPreview = pageContext.urlParams.get("preview") === "local";
  const shared = localPreview
    ? {
        issue: null,
        ads: null,
      }
    : await loadSharedPublication();

  const localIssue = localPreview
    ? readJson(STORAGE_KEYS.draft, null) || readJson(STORAGE_KEYS.issue, null)
    : readJson(STORAGE_KEYS.issue, null);

  const localAds = readJson(STORAGE_KEYS.ads, null);

  const issue = shared.issue
    ? {
        ...demo.issue,
        ...shared.issue,
      }
    : {
        ...demo.issue,
        ...(localIssue || {}),
      };

  const venues = readJson(STORAGE_KEYS.venues, demo.venues);

  const sharedAds = Array.isArray(shared.ads) ? shared.ads : [];
  const browserAds = Array.isArray(localAds) ? localAds : [];
  const ads = browserAds.length
    ? [
        ...browserAds,
        ...sharedAds.filter((sharedAd) => !browserAds.some((browserAd) => Number(browserAd.slot) === Number(sharedAd.slot))),
      ]
    : sharedAds.length
      ? sharedAds
      : demo.ads;

  const events =
    localStorage.getItem(STORAGE_KEYS.events) === null
      ? demo.events || []
      : readJson(STORAGE_KEYS.events, []);

  renderIssue(issue);
  renderCalendarEvents(issue, events);
  resolveVenue(venues);

  await detectUserMarketByIp();

  renderAds(ads.length ? ads : demo.ads);

  recordAnalytics("issue_view", {
    issueMonthYear: issue.issueMonthYear,
    venueSlug: pageContext.venueSlug || null,
  });

  bindClicks();
  bindEventSubmission();
}

document.addEventListener("DOMContentLoaded", init);

window.PottyFavorAds = {
  generateAdImage,
  generateAdVideo,
  renderGeneratedAd,
  showAdLoading,
  showAdError,
};
