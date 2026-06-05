const form = document.querySelector("#ad-generator-form");
const slotButtons = document.querySelector("#slot-buttons");
const saveStatus = document.querySelector("#save-status");
const previewStage = document.querySelector("#graphic-ad-preview");
const downloadButton = document.querySelector("#download-png");
const saveDraftButton = document.querySelector("#save-draft");
const generateButton = document.querySelector("#generate-button");

const outputFields = {
  headline: document.querySelector("#output-headline"),
  subheadline: document.querySelector("#output-subheadline"),
  ctaButtonText: document.querySelector("#output-cta"),
  designPrompt: document.querySelector("#output-design-prompt"),
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
    headlinePrefix: "Your neighborhood favorite",
    subheadline: "A practical, friendly offer that feels made for locals and regulars.",
    cta: "Visit Local",
    template: "contractor",
  },
  "Family-Friendly": {
    headlinePrefix: "Bring the whole crew",
    subheadline: "Bright, upbeat creative for parents, kids, groups, and easy weekend wins.",
    cta: "Plan Family Fun",
    template: "family",
  },
  Nightlife: {
    headlinePrefix: "Keep the night glowing",
    subheadline: "A neon-ready promotion for late crowds, event guests, and after-dark decision makers.",
    cta: "Start The Night",
    template: "event",
  },
};

const templateColorDefaults = {
  vegas: ["#ff2dff", "#00f5ff", "#ffd400"],
  coupon: ["#ff2d2d", "#ffd400", "#111827"],
  luxury: ["#050505", "#d4af37", "#ffffff"],
  family: ["#2dd4bf", "#ffd166", "#ef476f"],
  contractor: ["#f97316", "#111827", "#facc15"],
  event: ["#7c2cff", "#ff2d7a", "#06b6d4"],
};

const DEFAULT_IMAGE_ENDPOINT = "/api/generate-ad-image";

let activeAd = null;

function cleanValue(value, fallback) {
  return StallTalkGraphicAds.safeText(value, fallback);
}

function makeCouponCode(businessName, offer) {
  const namePart = businessName.replace(/[^a-z0-9]/gi, "").slice(0, 7).toUpperCase() || "STALL";
  const offerNumber = offer.match(/\d+/)?.[0] || "10";
  return `${namePart}${offerNumber}`;
}

function titleCase(value) {
  return cleanValue(value, "").replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function selectedMode() {
  return form.querySelector('input[name="adMode"]:checked')?.value || "image";
}

function endpointUrl() {
  return cleanValue(window.STALLTALK_AD_IMAGE_ENDPOINT, DEFAULT_IMAGE_ENDPOINT);
}

function collectFormValues() {
  const formData = new FormData(form);
  const businessName = cleanValue(formData.get("businessName"), "Your Business");
  const offer = cleanValue(formData.get("offer"), "a limited-time offer");
  const couponCode = cleanValue(formData.get("couponCode"), makeCouponCode(businessName, offer));
  const template = cleanValue(formData.get("template"), "vegas");
  const colors = templateColorDefaults[template] || templateColorDefaults.vegas;
  const adSizeKey = StallTalkGraphicAds.adSizeKey(formData.get("adSize"));
  const adSize = StallTalkGraphicAds.sizes[adSizeKey].label;

  return {
    adMode: cleanValue(formData.get("adMode"), selectedMode()),
    businessName,
    businessCategory: cleanValue(formData.get("businessCategory"), "Local Business"),
    offer,
    couponCode,
    phone: cleanValue(formData.get("phone"), ""),
    website: cleanValue(formData.get("website"), ""),
    targetAudience: cleanValue(formData.get("targetAudience"), "nearby customers"),
    style: cleanValue(formData.get("style"), "Bold"),
    tone: cleanValue(formData.get("style"), "Bold"),
    adSize,
    adSizeKey,
    template,
    primaryColor: cleanValue(formData.get("primaryColor"), colors[0]),
    secondaryColor: cleanValue(formData.get("secondaryColor"), colors[1]),
    accentColor: cleanValue(formData.get("accentColor"), colors[2]),
    imageUrl: cleanValue(formData.get("imageUrl"), ""),
  };
}

function buildImagePrompt(inputs) {
  const sizeDetails = StallTalkGraphicAds.sizes[inputs.adSizeKey] || StallTalkGraphicAds.sizes.banner;
  const footerInstruction = inputs.adSizeKey === "footer" ? "Design as an ultra-wide footer banner in a 1792x512 safe area with no important content outside the center horizontal band." : "";

  return [
    `Create a complete, polished graphic advertisement for ${inputs.businessName}.`,
    `Ad size: ${sizeDetails.label}.`,
    `Business category: ${inputs.businessCategory}.`,
    `Offer: ${inputs.offer}.`,
    `Coupon: ${inputs.couponCode}.`,
    `Style: ${inputs.style}.`,
    `Target audience: ${inputs.targetAudience}.`,
    `Required visible contact details: phone ${inputs.phone || "not provided"}, website ${inputs.website || "not provided"}.`,
    `Use bold legible advertising typography, a finished layout, strong hierarchy, a clear CTA, and brand color inspiration ${inputs.primaryColor}, ${inputs.secondaryColor}, ${inputs.accentColor}.`,
    inputs.imageUrl ? `If useful, incorporate this logo/reference URL visually: ${inputs.imageUrl}.` : "No external logo is required.",
    footerInstruction,
    "Return only the final ad image with the promotional copy integrated into the design; do not include mockup frames or placeholder text.",
  ].filter(Boolean).join(" ");
}

function generateGraphicAdLocally(inputs) {
  const tone = toneCopy[inputs.style] || toneCopy.Bold;
  const headline = `${tone.headlinePrefix}: ${titleCase(inputs.offer)}`;
  const subheadline = `${tone.subheadline} Designed for ${inputs.targetAudience}.`;

  return {
    ...inputs,
    adMode: "html",
    headline,
    subheadline,
    ctaButtonText: tone.cta,
    designPrompt: `${StallTalkGraphicAds.templates[inputs.template]} ${inputs.adSize.toLowerCase()} advertisement for ${inputs.businessName}, a ${inputs.businessCategory}, with a ${inputs.style.toLowerCase()} style, prominent offer badge for “${inputs.offer}”, coupon code ${inputs.couponCode}, CTA, phone/website, decorative shapes, brand colors ${inputs.primaryColor}, ${inputs.secondaryColor}, and ${inputs.accentColor}.`,
    imageAdUrl: "",
    imageAdBase64: "",
    generatedAt: new Date().toISOString(),
  };
}

async function generateImageAd(inputs) {
  const designPrompt = buildImagePrompt(inputs);
  const response = await fetch(endpointUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...inputs, prompt: designPrompt }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Image endpoint returned ${response.status}`);
  }

  const generatedAd = {
    ...inputs,
    adMode: "image",
    headline: `${inputs.businessName}: ${inputs.offer}`,
    subheadline: `AI image ad for ${inputs.targetAudience}.`,
    ctaButtonText: "Claim This Deal",
    designPrompt: payload.prompt || designPrompt,
    imageAdUrl: cleanValue(payload.imageUrl || payload.url, ""),
    imageAdBase64: cleanValue(payload.imageBase64 || payload.b64_json, ""),
    generatedSize: payload.size || "",
    requestedSize: payload.requestedSize || inputs.adSize,
    generatedAt: new Date().toISOString(),
  };

  if (!StallTalkGraphicAds.imageSource(generatedAd)) {
    throw new Error("Image endpoint did not return imageUrl or imageBase64.");
  }

  return generatedAd;
}

function currentGeneratedAd() {
  const inputs = collectFormValues();

  return {
    ...activeAd,
    ...inputs,
    adMode: selectedMode(),
    headline: cleanValue(outputFields.headline.value, activeAd?.headline || "A Deal Worth Stopping For"),
    subheadline: cleanValue(outputFields.subheadline.value, activeAd?.subheadline || "Made for nearby customers ready to act."),
    ctaButtonText: cleanValue(outputFields.ctaButtonText.value, activeAd?.ctaButtonText || "Claim This Deal"),
    designPrompt: cleanValue(outputFields.designPrompt.value, activeAd?.designPrompt || buildImagePrompt(inputs)),
    imageAdUrl: activeAd?.imageAdUrl || "",
    imageAdBase64: activeAd?.imageAdBase64 || "",
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

function readSavedSlots() {
  try {
    return JSON.parse(localStorage.getItem(StallTalkGraphicAds.storageKey)) || {};
  } catch (error) {
    console.warn("Unable to read saved Stall Talk graphic ads", error);
    return {};
  }
}

function saveSlot(slotNumber, ad) {
  const savedSlots = readSavedSlots();
  savedSlots[slotNumber] = { ...ad, savedAt: new Date().toISOString() };
  localStorage.setItem(StallTalkGraphicAds.storageKey, JSON.stringify(savedSlots));
  saveStatus.textContent = `Applied “${ad.businessName}” ${ad.adMode === "image" ? "AI image" : "HTML/CSS"} ad to paid Ad Slot ${slotNumber}. Open the public issue in this browser to see it.`;
}

function saveDraft(ad) {
  localStorage.setItem(StallTalkGraphicAds.draftStorageKey, JSON.stringify({ ...ad, savedAt: new Date().toISOString() }));
  saveStatus.textContent = `Saved “${ad.businessName}” as the current ad draft in localStorage.`;
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
    scale: 2,
    useCORS: true,
  });

  const link = document.createElement("a");
  const fileName = cleanValue(activeAd?.businessName, "stalltalk-ad").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "stalltalk-ad";
  link.download = `${fileName}-graphic-ad.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  saveStatus.textContent = "Downloaded the graphic ad PNG.";
}

function buildSlotButtons() {
  for (let slotNumber = 1; slotNumber <= 8; slotNumber += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${slotNumber}`;
    button.setAttribute("aria-label", `Apply generated graphic ad to Ad Slot ${slotNumber}`);
    button.addEventListener("click", () => {
      const ad = currentGeneratedAd();
      if (selectedMode() === "image" && !StallTalkGraphicAds.imageSource(ad)) {
        saveStatus.textContent = "Generate an AI image ad before applying this mode to a paid slot, or switch to HTML/CSS fallback mode.";
        return;
      }
      saveSlot(slotNumber, ad);
    });
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

function updateModeControls() {
  const mode = selectedMode();
  generateButton.textContent = mode === "image" ? "Generate AI Image Ad" : "Generate HTML/CSS Ad";
  saveStatus.textContent = mode === "image"
    ? "AI Image Ad mode sends the prompt to your Vercel endpoint. No OpenAI key is stored in this frontend."
    : "Fallback mode renders the original browser-only HTML/CSS ad without calling an image API.";
}

function handleModeChange() {
  const inputs = collectFormValues();
  if (selectedMode() === "html") {
    renderGeneratedAd(generateGraphicAdLocally(inputs));
  } else if (!StallTalkGraphicAds.imageSource(activeAd || {})) {
    renderGeneratedAd({
      ...inputs,
      adMode: "image",
      headline: `${inputs.businessName}: ${inputs.offer}`,
      subheadline: `Ready to generate an AI image ad for ${inputs.targetAudience}.`,
      ctaButtonText: "Claim This Deal",
      designPrompt: buildImagePrompt(inputs),
      imageAdUrl: "",
      imageAdBase64: "",
      generatedAt: new Date().toISOString(),
    });
  }
  updateModeControls();
}

async function handleGenerate(event) {
  event.preventDefault();
  const inputs = collectFormValues();
  const mode = selectedMode();

  generateButton.disabled = true;
  previewStage.setAttribute("aria-busy", "true");
  saveStatus.textContent = mode === "image" ? "Generating AI image ad through the secure backend…" : "Generating HTML/CSS fallback ad…";

  try {
    const generatedAd = mode === "image" ? await generateImageAd(inputs) : generateGraphicAdLocally(inputs);
    renderGeneratedAd(generatedAd);
    saveStatus.textContent = mode === "image"
      ? "Finished AI image ad generated. Save it to a paid slot so the homepage displays the generated image."
      : "Finished fallback HTML/CSS ad generated. Edit the copy, download PNG, save, or apply it to a paid slot.";
  } catch (error) {
    console.error("Unable to generate AI image ad", error);
    saveStatus.textContent = `AI image generation failed: ${error.message}. No API key is exposed here; check the Vercel endpoint or switch to HTML/CSS fallback mode.`;
  } finally {
    generateButton.disabled = false;
    previewStage.removeAttribute("aria-busy");
  }
}

form.addEventListener("submit", handleGenerate);

Object.values(outputFields).forEach((field) => {
  field.addEventListener("input", () => {
    activeAd = currentGeneratedAd();
    previewStage.replaceChildren(StallTalkGraphicAds.build(activeAd, { link: false }));
  });
});

["#business-name", "#business-category", "#offer", "#coupon-code", "#phone", "#website", "#target-audience", "#style", "#ad-size", "#primary-color", "#secondary-color", "#accent-color", "#image-url"].forEach((selector) => {
  document.querySelector(selector).addEventListener("input", () => {
    if (!activeAd) return;
    activeAd = currentGeneratedAd();
    if (activeAd.adMode === "image" && StallTalkGraphicAds.imageSource(activeAd)) {
      activeAd.imageAdUrl = "";
      activeAd.imageAdBase64 = "";
      activeAd.designPrompt = buildImagePrompt(activeAd);
      outputFields.designPrompt.value = activeAd.designPrompt;
      saveStatus.textContent = "Ad details changed. Click Generate AI Image Ad again to create a fresh image before saving to a slot.";
    } else if (activeAd.adMode !== "image") {
      activeAd = generateGraphicAdLocally(activeAd);
    }
    previewStage.replaceChildren(StallTalkGraphicAds.build(activeAd, { link: false }));
  });
});

form.querySelectorAll('input[name="adMode"]').forEach((field) => field.addEventListener("change", handleModeChange));

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
updateModeControls();
renderGeneratedAd(generateGraphicAdLocally(collectFormValues()));

const STALLTALK_CONTENT_DRAFT_STORAGE_KEY = "stalltalk_content_draft";
const STALLTALK_CONTENT_PUBLISHED_STORAGE_KEY = "stalltalk_content_published";
const contentGenerateButton = document.querySelector("#ai-generate-content");
const contentSaveDraftButton = document.querySelector("#save-content-draft");
const contentPublishButton = document.querySelector("#publish-content");
const contentStatus = document.querySelector("#content-status");
const contentPreview = document.querySelector("#content-preview");
const contentFields = Array.from(document.querySelectorAll("[data-content-field]"));

const contentSectionLabels = {
  trivia: "Did You Know",
  joke: "Hilariously Funny",
  quote: "Inspirational Quote",
  word: "Word of the Day",
  article: "Featured Article",
  deal: "Local Deal",
  event: "Event Spotlight",
};

function generateIssueContent() {
  const stamp = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return {
    trivia: [
      "Bathroom hand dryers can move air at highway speeds.",
      "The first patent for perforated toilet paper appeared in the 1890s.",
      "A two-minute read is about the perfect length for a quick restroom pause.",
      `This ${stamp} edition was generated for a fresh Stall Talk visit.`,
    ].join("\n"),
    joke: "Why did the restroom newsletter get invited everywhere? Because it always knew how to break the ice without clogging the conversation.",
    quote: "“A good pause is not wasted time; it is where the next bright idea gets room to stretch.”",
    word: "Interlude — a short pause between bigger moments; exactly what a Stall Talk visit turns into.",
    article: "Tonight's best plans can start with one small detour. Pick the glowing sign you have not tried, split a snack with someone fun, and give yourself permission to make the next stop the story you tell tomorrow.",
    deal: "Show this Stall Talk issue at a nearby participating counter and ask for the reader perk of the night.",
    event: "Before heading home, look for a late pop-up, patio set, trivia round, or photo-worthy corner within a few blocks of the venue.",
  };
}

function readContentDraft() {
  try {
    return JSON.parse(localStorage.getItem(STALLTALK_CONTENT_DRAFT_STORAGE_KEY)) || null;
  } catch (error) {
    console.warn("Unable to read Stall Talk content draft", error);
    return null;
  }
}

function collectIssueContent() {
  return contentFields.reduce((content, field) => {
    content[field.dataset.contentField] = field.value.trim();
    return content;
  }, {});
}

function populateIssueContentFields(content) {
  contentFields.forEach((field) => {
    field.value = content?.[field.dataset.contentField] || "";
  });
}

function saveIssueContentDraft(content = collectIssueContent(), statusMessage = "Saved issue content draft to localStorage.") {
  localStorage.setItem(STALLTALK_CONTENT_DRAFT_STORAGE_KEY, JSON.stringify({ ...content, savedAt: new Date().toISOString() }));
  if (contentStatus) contentStatus.textContent = statusMessage;
}

function renderIssueContentPreview(content = collectIssueContent()) {
  if (!contentPreview) return;

  contentPreview.replaceChildren(
    ...Object.entries(contentSectionLabels).map(([key, label]) => {
      const card = document.createElement("article");
      card.className = `studio-story${key === "trivia" || key === "article" ? " studio-story-wide" : ""}`;

      const eyebrow = document.createElement("span");
      eyebrow.textContent = label;
      const heading = document.createElement("h3");
      heading.textContent = key === "trivia" ? "10 Fast Facts for the Stall" : label;

      card.append(eyebrow, heading);

      if (key === "trivia") {
        const list = document.createElement("ol");
        (content[key] || "").split(/\n+/).map((fact) => fact.trim()).filter(Boolean).forEach((fact) => {
          const item = document.createElement("li");
          item.textContent = fact;
          list.append(item);
        });
        card.append(list);
      } else {
        const copy = document.createElement("p");
        copy.textContent = content[key] || "Generate or type content for this section.";
        card.append(copy);
      }

      return card;
    }),
  );
}

function handleIssueContentGenerate() {
  const content = generateIssueContent();
  populateIssueContentFields(content);
  renderIssueContentPreview(content);
  saveIssueContentDraft(content, "Generated every publication section, saved the draft to localStorage, and updated the preview.");
}

function publishIssueContent() {
  const content = collectIssueContent();
  saveIssueContentDraft(content, "Saved issue content draft to localStorage.");
  localStorage.setItem(STALLTALK_CONTENT_PUBLISHED_STORAGE_KEY, JSON.stringify({ ...content, publishedAt: new Date().toISOString() }));
  if (contentStatus) contentStatus.textContent = "Published issue content to localStorage. Open or refresh the public homepage in this browser to see it.";
}

if (contentGenerateButton && contentPreview && contentFields.length) {
  const initialContent = readContentDraft() || generateIssueContent();
  populateIssueContentFields(initialContent);
  renderIssueContentPreview(initialContent);

  contentGenerateButton.addEventListener("click", handleIssueContentGenerate);
  contentSaveDraftButton.addEventListener("click", () => saveIssueContentDraft());
  contentPublishButton.addEventListener("click", publishIssueContent);
  contentFields.forEach((field) => {
    field.addEventListener("input", () => {
      const content = collectIssueContent();
      renderIssueContentPreview(content);
      saveIssueContentDraft(content, "Draft updated in localStorage and preview refreshed.");
    });
  });
}
