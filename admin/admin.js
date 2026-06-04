const form = document.querySelector("#ad-generator-form");
const slotButtons = document.querySelector("#slot-buttons");
const saveStatus = document.querySelector("#save-status");
const previewStage = document.querySelector("#graphic-ad-preview");
const downloadButton = document.querySelector("#download-png");
const saveDraftButton = document.querySelector("#save-draft");

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
    headlinePrefix: "Your neighborhood hook-up",
    subheadline: "A trusted local offer for people already close enough to become regulars.",
    cta: "Support Local",
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

function collectFormValues() {
  const formData = new FormData(form);
  const businessName = cleanValue(formData.get("businessName"), "Your Business");
  const offer = cleanValue(formData.get("offer"), "a limited-time offer");
  const couponCode = cleanValue(formData.get("couponCode"), makeCouponCode(businessName, offer));
  const template = cleanValue(formData.get("template"), "vegas");
  const colors = templateColorDefaults[template] || templateColorDefaults.vegas;

  return {
    businessName,
    businessCategory: cleanValue(formData.get("businessCategory"), "Local Business"),
    offer,
    couponCode,
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
  // Future AI integration placeholder:
  // 1. Send `inputs` to a secure serverless endpoint instead of calling OpenAI directly from GitHub Pages.
  // 2. The serverless endpoint could call an OpenAI image generation or design API with the business details,
  //    selected template, tone, ad size, brand colors, and optional logo/image URL.
  // 3. Return generated visual directions, copy, and image asset URLs to this browser-only admin.
  // 4. Never place private API keys in this static client-side JavaScript file.
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
