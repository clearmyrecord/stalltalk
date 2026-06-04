const form = document.querySelector("#ad-generator-form");
const slotButtons = document.querySelector("#slot-buttons");
const saveStatus = document.querySelector("#save-status");
const previewStage = document.querySelector("#graphic-ad-preview");
const downloadButton = document.querySelector("#download-png");
const saveDraftButton = document.querySelector("#save-draft");

const CONTENT_DRAFT_STORAGE_KEY = "stalltalk_content_studio_draft_v1";
const CONTENT_PUBLISHED_STORAGE_KEY = "stalltalk_content_studio_published_v1";

const outputFields = {
  headline: document.querySelector("#output-headline"),
  subheadline: document.querySelector("#output-subheadline"),
  ctaButtonText: document.querySelector("#output-cta"),
  designPrompt: document.querySelector("#output-design-prompt"),
};

const contentFields = {
  joke: document.querySelector("#content-joke"),
  trivia: document.querySelector("#content-trivia"),
  quote: document.querySelector("#content-quote"),
  word: document.querySelector("#content-word"),
  article: document.querySelector("#content-article"),
  deal: document.querySelector("#content-deal"),
  event: document.querySelector("#content-event"),
};

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
    template: "coupon",
  },
  Bold: {
    headlinePrefix: "Grab this deal now",
    subheadline: "High-contrast, high-energy creative built to make nearby customers act fast.",
    cta: "Claim It Today",
    template: "vegas",
  },
  Luxury: {
    headlinePrefix: "Premium perks await",
    subheadline: "A polished black-and-gold offer for guests who expect the night to feel first class.",
    cta: "Unlock VIP Offer",
    template: "luxury",
  },
  Local: {
    headlinePrefix: "Your neighborhood hook-up",
    subheadline: "A trusted local offer for people already close enough to become regulars.",
    cta: "Support Local",
    template: "contractor",
  },
@@ -96,93 +142,87 @@ function collectFormValues() {
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
  return generateGraphicAdLocally(inputs);
}

function currentGeneratedAd() {
  const inputs = collectFormValues();

  return {
    ...inputs,
    headline: cleanValue(outputFields.headline.value, activeAd?.headline || "A Deal Worth Stopping For"),
    subheadline: cleanValue(outputFields.subheadline.value, activeAd?.subheadline || "Made for nearby customers ready to act."),
    ctaButtonText: cleanValue(outputFields.ctaButtonText.value, activeAd?.ctaButtonText || "Claim This Deal"),
    designPrompt: cleanValue(outputFields.designPrompt.value, activeAd?.designPrompt || "Future AI design prompt will appear here."),
    generatedAt: activeAd?.generatedAt || new Date().toISOString(),
  };
}

function renderGeneratedAd(ad) {
  activeAd = ad;
  outputFields.headline.value = ad.headline || "";
  outputFields.subheadline.value = ad.subheadline || "";
  outputFields.ctaButtonText.value = ad.ctaButtonText || "";
  outputFields.designPrompt.value = ad.designPrompt || "";

  previewStage.replaceChildren(StallTalkGraphicAds.build(ad, { link: false }));
}

function readJsonStorage(key, fallback = {}) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch (error) {
    console.warn(`Unable to read ${key}`, error);
    return fallback;
  }
}

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
  const canvas = await html2canvas(adNode, {
    backgroundColor: null,
@@ -197,60 +237,183 @@ async function downloadPng() {
  link.click();
  saveStatus.textContent = "Downloaded the graphic ad PNG.";
}

function buildSlotButtons() {
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
    article.className = "studio-story";

    const badge = document.createElement("span");
    badge.textContent = label;
    const heading = document.createElement("h3");
    heading.textContent = label;
    article.append(badge, heading);

    if (key === "trivia") {
      const list = document.createElement("ol");
      cleanValue(content[key], defaultContent[key]).split(/\n+/).filter(Boolean).forEach((fact) => {
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

function generatePlaceholderContent() {
  const facts = [
    "A QR code can store thousands of numeric characters in a tiny square.",
    "The first neon sign in Las Vegas appeared long before social media made signs famous.",
    "Most people remember short, funny copy better than long formal notices.",
    "Restroom ads work because every visitor eventually takes a pause.",
    "The word magazine originally referred to a storehouse.",
    "A catchy coupon code is easier to use when it is short and pronounceable.",
    "Local deals convert best when the reward is clear in one sentence.",
    "The average smartphone can scan QR codes directly through the camera app.",
    "Trivia feels stickier when it includes a surprising comparison.",
    "Great issue content mixes laughs, utility, and something worth sharing.",
  ];

  return {
    trivia: facts.join("\n"),
    joke: "I tried to write a restroom joke, but every punchline was occupied.",
    quote: "“A good pause is not wasted time; it is where the next good idea catches up.”",
    word: "Effervescent — lively, bubbly, and full of energy.",
    article: "Featured Article: The fastest way to upgrade a night out is to add one local discovery. Pick a nearby snack, a photo stop, or a tiny show you did not plan for, then let the detour become the story.",
    deal: "Local Deal Template: Bring this Stall Talk issue to [Business Name] for [Discount/Bonus] today only. Mention code STALLTALK at checkout.",
    event: "Event Spotlight: [Event Name] lights up [Venue] at [Time]. Arrive early for [Pre-show Idea] and keep this issue handy for nearby offers.",
  };
}

function saveContentDraft() {
  const content = collectContentValues();
  localStorage.setItem(CONTENT_DRAFT_STORAGE_KEY, JSON.stringify({ ...content, savedAt: new Date().toISOString() }));
  contentStatus.textContent = "Saved Content Studio draft to localStorage.";
  renderContentPreview(content);
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
  });

  Object.values(outputFields).forEach((field) => {
    field.addEventListener("input", () => {
      activeAd = currentGeneratedAd();
      previewStage.replaceChildren(StallTalkGraphicAds.build(activeAd, { link: false }));
    });
  });

  ["#business-name", "#business-category", "#offer", "#coupon-code", "#phone", "#website", "#target-audience", "#tone", "#ad-size", "#primary-color", "#secondary-color", "#accent-color", "#image-url"].forEach((selector) => {
    document.querySelector(selector).addEventListener("input", () => {
      if (!activeAd) return;
      activeAd = currentGeneratedAd();
      previewStage.replaceChildren(StallTalkGraphicAds.build(activeAd, { link: false }));
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

  document.querySelector("#ai-generate-content").addEventListener("click", () => {
    const generatedContent = generatePlaceholderContent();
    applyContentValues(generatedContent);
    renderContentPreview(generatedContent);
    contentStatus.textContent = "Generated placeholder AI content locally. Review, save, or publish it.";
  });

  document.querySelector("#preview-content").addEventListener("click", () => {
    renderContentPreview(collectContentValues());
    contentStatus.textContent = "Preview refreshed from current Content Studio fields.";
  });

  document.querySelector("#save-content").addEventListener("click", saveContentDraft);
  document.querySelector("#publish-content").addEventListener("click", publishContent);

  Object.values(contentFields).forEach((field) => {
    field.addEventListener("input", () => renderContentPreview(collectContentValues()));
  });
}

initTabs();
initAdStudio();
initContentStudio();
