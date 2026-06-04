const form = document.querySelector("#ad-generator-form");
const slotButtons = document.querySelector("#slot-buttons");
const saveStatus = document.querySelector("#save-status");
const previewStage = document.querySelector("#graphic-ad-preview");
const downloadButton = document.querySelector("#download-png");
const saveDraftButton = document.querySelector("#save-draft");

const CONTENT_DRAFT_STORAGE_KEY = "stalltalk_content_draft";
const CONTENT_PUBLISHED_STORAGE_KEY = "stalltalk_content_published";

const outputFields = {
  headline: document.querySelector("#output-headline"),
  subheadline: document.querySelector("#output-subheadline"),
  ctaButtonText: document.querySelector("#output-cta"),
  designPrompt: document.querySelector("#output-design-prompt"),
};

const contentFields = Object.fromEntries(
  Array.from(document.querySelectorAll("[data-content-field]")).map((field) => [field.dataset.contentField, field]),
);

const contentStatus = document.querySelector("#content-status");
const contentPreview = document.querySelector("#content-preview");
const contentLabels = {
  joke: "Hilariously Funny",
  trivia: "Did You Know",
  quote: "Inspirational Quote",
  word: "Word of the Day",
  article: "Featured Article",
  deal: "Local Deal",
  event: "Event Spotlight",
};

const defaultContent = {
  joke: "Why did the restroom magazine get promoted? It had excellent stall presence.",
  trivia: [
    "Las Vegas has more hotel rooms than many entire cities.",
    "The average person checks their phone dozens of times a day.",
    "Neon signs are made bright by electrified gas in glass tubes.",
    "QR codes were first invented to track auto parts.",
    "A sneeze can travel faster than a city bus.",
    "The word trivia comes from a place where three roads meet.",
    "Some casinos pump in fresh outside air around the clock.",
    "A deck of cards has the same number of cards as weeks in a year.",
    "Bananas are berries, botanically speaking.",
    "The shortest complete sentence in English is often said to be Go.",
  ].join("\n"),
  quote: "“Make the most of the pause; even a quick stop can point you toward the next good thing.”",
  word: "Serendipity — finding something good while looking for something else.",
  article: "The best local nights are built from tiny decisions: where to meet, what to try, and which glowing doorway looks interesting enough to investigate.",
  deal: "Local Deal Template: Show this issue at [Business Name] for [Offer]. Valid [Dates]. Use code STALLTALK.",
  event: "Event Spotlight: Tonight at [Venue], catch [Event Name] at [Time]. Add a quick local stop before or after the show.",
};

const toneCopy = {
  Funny: {
    headlinePrefix: "So good it should be illegal",
    subheadline: "A cheeky stop-worthy deal for people who love a little restroom reading with their rewards.",
    cta: "Laugh & Save",
  },
  Bold: {
    headlinePrefix: "Grab this deal now",
    subheadline: "High-contrast, high-energy creative built to make nearby customers act fast.",
    cta: "Claim It Today",
  },
  Luxury: {
    headlinePrefix: "Premium perks await",
    subheadline: "A polished black-and-gold offer for guests who expect the night to feel first class.",
    cta: "Unlock VIP Offer",
  },
  Local: {
    headlinePrefix: "Your neighborhood hook-up",
    subheadline: "A trusted local offer for people already close enough to become regulars.",
    cta: "Support Local",
  },
  "Family-Friendly": {
    headlinePrefix: "Bring the whole crew",
    subheadline: "Bright, welcoming creative that keeps the offer simple for families on the move.",
    cta: "Plan the Fun",
  },
  Nightlife: {
    headlinePrefix: "Keep the night glowing",
    subheadline: "Neon-paced copy for after-dark guests looking for the next stop.",
    cta: "Go Tonight",
  },
};

const templateColorDefaults = {
  vegas: ["#ff2d2d", "#ffd400", "#7c2cff"],
  coupon: ["#f97316", "#fef08a", "#111827"],
  luxury: ["#111111", "#d4af37", "#ffffff"],
  family: ["#14b8a6", "#fde68a", "#f472b6"],
  contractor: ["#f59e0b", "#1f2937", "#f8fafc"],
  event: ["#2563eb", "#f43f5e", "#facc15"],
};

let activeAd = null;

function cleanValue(value, fallback = "") {
  return String(value || "").trim() || fallback;
}

function titleCase(value) {
  return cleanValue(value)
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function collectFormValues() {
  const formData = new FormData(form);
  const template = cleanValue(formData.get("template"), "vegas");
  const colors = templateColorDefaults[template] || templateColorDefaults.vegas;

  return {
    businessName: cleanValue(formData.get("businessName"), "Your Business"),
    businessCategory: cleanValue(formData.get("businessCategory"), "Local Favorite"),
    offer: cleanValue(formData.get("offer"), "Limited-time special"),
    couponCode: cleanValue(formData.get("couponCode"), "STALL10"),
    phone: cleanValue(formData.get("phone"), ""),
    website: cleanValue(formData.get("website"), ""),
    targetAudience: cleanValue(formData.get("targetAudience"), "nearby customers"),
    tone: cleanValue(formData.get("tone"), "Bold"),
    adSize: cleanValue(formData.get("adSize"), "Banner"),
    template,
    primaryColor: cleanValue(formData.get("primaryColor"), colors[0]),
    secondaryColor: cleanValue(formData.get("secondaryColor"), colors[1]),
    accentColor: cleanValue(formData.get("accentColor"), colors[2]),
    imageUrl: cleanValue(formData.get("imageUrl"), ""),
  };
}

function generateGraphicAdLocally(inputs) {
  const tone = toneCopy[inputs.tone] || toneCopy.Bold;
  const headline = `${tone.headlinePrefix}: ${titleCase(inputs.offer)}`;
  const subheadline = `${tone.subheadline} Designed for ${inputs.targetAudience}.`;

  return {
    ...inputs,
    headline,
    subheadline,
    ctaButtonText: tone.cta,
    designPrompt: `${StallTalkGraphicAds.templates[inputs.template]} ${inputs.adSize.toLowerCase()} advertisement for ${inputs.businessName}, a ${inputs.businessCategory}, with a ${inputs.tone.toLowerCase()} tone, prominent offer badge for “${inputs.offer}”, coupon code ${inputs.couponCode}, CTA, phone/website, decorative shapes, brand colors ${inputs.primaryColor}, ${inputs.secondaryColor}, and ${inputs.accentColor}.`,
    generatedAt: new Date().toISOString(),
  };
}

function generateGraphicAdWithAI(inputs) {
@@ -147,149 +183,155 @@ function readJsonStorage(key, fallback = {}) {
function saveSlot(slotNumber, ad) {
  const savedSlots = readJsonStorage(StallTalkGraphicAds.storageKey);
  savedSlots[slotNumber] = { ...ad, savedAt: new Date().toISOString() };
  localStorage.setItem(StallTalkGraphicAds.storageKey, JSON.stringify(savedSlots));
  saveStatus.textContent = `Applied “${ad.businessName}” graphic ad to paid Ad Slot ${slotNumber}. Open the public issue in this browser to see it.`;
}

function saveDraft(ad) {
  localStorage.setItem(StallTalkGraphicAds.draftStorageKey, JSON.stringify({ ...ad, savedAt: new Date().toISOString() }));
  saveStatus.textContent = `Saved “${ad.businessName}” as the current graphic ad draft in localStorage.`;
}

async function downloadPng() {
  const adNode = previewStage.querySelector(".graphic-ad");
  if (!adNode) {
    saveStatus.textContent = "Generate a graphic ad before downloading.";
    return;
  }

  if (!window.html2canvas) {
    saveStatus.textContent = "PNG export needs html2canvas from the CDN. Check your network connection and try again.";
    return;
  }

  saveStatus.textContent = "Rendering PNG export…";
  const canvas = await html2canvas(adNode, { backgroundColor: null });
  const link = document.createElement("a");
  link.download = `${cleanValue(activeAd?.businessName, "stall-talk-ad").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  saveStatus.textContent = "Downloaded the graphic ad PNG.";
}

function buildSlotButtons() {
  slotButtons.replaceChildren();
  for (let slotNumber = 1; slotNumber <= 8; slotNumber += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${slotNumber}`;
    button.setAttribute("aria-label", `Apply generated graphic ad to Ad Slot ${slotNumber}`);
    button.addEventListener("click", () => saveSlot(slotNumber, currentGeneratedAd()));
    slotButtons.append(button);
  }
}

function applyTemplateDefaults() {
  const template = document.querySelector("#template").value;
  const colors = templateColorDefaults[template];
  if (!colors) return;

  document.querySelector("#primary-color").value = colors[0];
  document.querySelector("#secondary-color").value = colors[1];
  document.querySelector("#accent-color").value = colors[2];
}

function collectContentValues() {
  return Object.fromEntries(Object.entries(contentFields).map(([key, field]) => [key, cleanValue(field.value, defaultContent[key])]));
}

function applyContentValues(content) {
  Object.entries(contentFields).forEach(([key, field]) => {
    field.value = cleanValue(content[key], defaultContent[key]);
  });
}

function renderContentPreview(content) {
  const cards = Object.entries(contentLabels).map(([key, label]) => {
    const article = document.createElement("article");
    article.className = key === "trivia" || key === "article" ? "studio-story studio-story-wide" : "studio-story";

    const badge = document.createElement("span");
    badge.textContent = label;
    const heading = document.createElement("h3");
    heading.textContent = key === "trivia" ? "10 Fast Facts for the Stall" : label;
    article.append(badge, heading);

    if (key === "trivia") {
      const list = document.createElement("ol");
      cleanValue(content[key], defaultContent[key])
        .split(/\n+/)
        .filter(Boolean)
        .forEach((fact) => {
          const item = document.createElement("li");
          item.textContent = fact;
          list.append(item);
        });
      article.append(list);
    } else {
      const paragraph = document.createElement("p");
      paragraph.textContent = cleanValue(content[key], defaultContent[key]);
      article.append(paragraph);
    }

    return article;
  });

  contentPreview.replaceChildren(...cards);
}

function saveContentDraft(content = collectContentValues(), message = "Saved Content Studio draft to localStorage.") {
  localStorage.setItem(CONTENT_DRAFT_STORAGE_KEY, JSON.stringify({ ...content, savedAt: new Date().toISOString() }));
  contentStatus.textContent = message;
  renderContentPreview(content);
}

function generateIssueContent() {
  const generatedContent = {
    joke: "I asked the restroom mirror for life advice. It said, ‘Reflect on your choices, then wash your hands like you mean it.’",
    trivia: [
      "A QR code can store thousands of numeric characters in one tiny square.",
      "Neon signs glow when electricity excites gas sealed inside glass tubes.",
      "The word trivia comes from an old term for a place where three roads meet.",
      "A catchy coupon code is usually easier to remember when it is short and pronounceable.",
      "Most modern phone cameras can scan QR codes without downloading a separate app.",
      "A deck of cards has 52 cards, matching the number of weeks in many calendar years.",
      "Bananas are berries botanically, but strawberries are not true berries.",
      "Local ads often work best when the offer is clear in one quick sentence.",
      "People tend to remember surprising facts better when they can repeat them immediately.",
      "Great restroom reading combines a laugh, a useful tip, and a reason to keep exploring.",
    ].join("\n"),
    quote: "“Even a quick pause can become the moment that points the whole day in a better direction.”",
    word: "Effervescent — lively, bubbly, and so energetic it practically arrives with its own soundtrack.",
    article: "Featured Article: The best local adventure rarely starts with a grand plan. It starts with one tiny yes: try the odd-looking appetizer, follow the music around the corner, scan the deal that made you smile, or text the friend who always knows where the good lights are. Stall Talk’s advice for tonight is simple: pick one nearby discovery, make it the story, and let the detour do the bragging tomorrow.",
    deal: "Local Deal: Flash this Stall Talk issue at Nacho Average tonight for 2-for-1 loaded fries after 9 PM. Use code STALLTALK and bring at least one friend willing to share the evidence.",
    event: "Event Spotlight: Neon Courtyard Laughs kicks off at 8 PM with pop-up comics, patio music, and a photo wall bright enough to make your group chat jealous.",
  };

  applyContentValues(generatedContent);
  saveContentDraft(generatedContent, "AI content generated and saved.");
  return generatedContent;
}

function publishContent() {
  const content = collectContentValues();
  localStorage.setItem(CONTENT_DRAFT_STORAGE_KEY, JSON.stringify({ ...content, savedAt: new Date().toISOString() }));
  localStorage.setItem(CONTENT_PUBLISHED_STORAGE_KEY, JSON.stringify({ ...content, publishedAt: new Date().toISOString() }));
  contentStatus.textContent = "Published Content Studio content. The public issue updates immediately in this browser.";
  renderContentPreview(content);
}

function initTabs() {
  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab").forEach((button) => button.classList.toggle("is-active", button === tab));
      document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.toggle("is-active", panel.id === tab.dataset.tabTarget));
    });
  });
}

function initAdStudio() {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const generatedAd = generateGraphicAdWithAI(collectFormValues());
    renderGeneratedAd(generatedAd);
    saveStatus.textContent = "Finished graphic ad generated. Edit the copy, download PNG, save, or apply it to a paid slot.";
@@ -310,48 +352,43 @@ function initAdStudio() {
    });
  });

  document.querySelector("#template").addEventListener("change", () => {
    applyTemplateDefaults();
    if (!activeAd) return;
    activeAd = currentGeneratedAd();
    previewStage.replaceChildren(StallTalkGraphicAds.build(activeAd, { link: false }));
  });

  downloadButton.addEventListener("click", downloadPng);
  saveDraftButton.addEventListener("click", () => saveDraft(currentGeneratedAd()));

  buildSlotButtons();
  applyTemplateDefaults();
  renderGeneratedAd(generateGraphicAdWithAI(collectFormValues()));
}

function initContentStudio() {
  const storedDraft = readJsonStorage(CONTENT_DRAFT_STORAGE_KEY, null);
  const published = readJsonStorage(CONTENT_PUBLISHED_STORAGE_KEY, null);
  const initialContent = storedDraft || published || defaultContent;
  applyContentValues(initialContent);
  renderContentPreview(initialContent);

  document.querySelector("#ai-generate-content").addEventListener("click", generateIssueContent);

  document.querySelector("#preview-content").addEventListener("click", () => {
    renderContentPreview(collectContentValues());
    contentStatus.textContent = "Preview refreshed from current Content Studio fields.";
  });

  document.querySelector("#save-content").addEventListener("click", () => saveContentDraft());
  document.querySelector("#publish-content").addEventListener("click", publishContent);

  Object.values(contentFields).forEach((field) => {
    field.addEventListener("input", () => renderContentPreview(collectContentValues()));
  });
}

initTabs();
initAdStudio();
initContentStudio();
script.js
script.js
