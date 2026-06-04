const AD_STORAGE_KEY = "stalltalk_ad_slots_v1";

const form = document.querySelector("#ad-generator-form");
const slotButtons = document.querySelector("#slot-buttons");
const saveStatus = document.querySelector("#save-status");
const previewCard = document.querySelector("#finished-ad-preview");

const outputFields = {
  headline: document.querySelector("#output-headline"),
  subheadline: document.querySelector("#output-subheadline"),
  offerText: document.querySelector("#output-offer-text"),
  ctaButtonText: document.querySelector("#output-cta"),
  couponCode: document.querySelector("#output-coupon"),
  disclaimer: document.querySelector("#output-disclaimer"),
  imagePrompt: document.querySelector("#output-image-prompt"),
};

const previewFields = {
  kicker: document.querySelector("#preview-kicker"),
  headline: document.querySelector("#preview-headline"),
  subheadline: document.querySelector("#preview-subheadline"),
  offer: document.querySelector("#preview-offer"),
  cta: document.querySelector("#preview-cta"),
  disclaimer: document.querySelector("#preview-disclaimer"),
};

const toneCopy = {
  Funny: {
    headlinePrefix: "Flush boring ads:",
    subheadline: "A restroom read worth washing your hands for.",
    imageMood: "playful, cheeky, colorful",
  },
  Classy: {
    headlinePrefix: "Elevate the stop:",
    subheadline: "A polished offer for guests who notice the details.",
    imageMood: "refined, editorial, warm lighting",
  },
  Bold: {
    headlinePrefix: "Stop scrolling:",
    subheadline: "A high-impact deal built for people on the move.",
    imageMood: "high contrast, energetic, poster style",
  },
  Local: {
    headlinePrefix: "Right around the corner:",
    subheadline: "A neighborhood favorite for the people already nearby.",
    imageMood: "authentic local street scene, inviting",
  },
  Luxury: {
    headlinePrefix: "Make it premium:",
    subheadline: "A luxe little upgrade before the night continues.",
    imageMood: "premium, cinematic, glossy",
  },
  "Family-Friendly": {
    headlinePrefix: "Everyone wins:",
    subheadline: "An easy, upbeat offer for the whole crew.",
    imageMood: "bright, welcoming, wholesome",
  },
};

const sizeClassByName = {
  Banner: "ad-size-banner",
  Square: "ad-size-square",
  Tall: "ad-size-tall",
  Footer: "ad-size-footer",
};

function cleanValue(value, fallback) {
  return value.trim() || fallback;
}

function makeCouponCode(businessName, offer) {
  const namePart = businessName.replace(/[^a-z0-9]/gi, "").slice(0, 7).toUpperCase() || "STALL";
  const offerNumber = offer.match(/\d+/)?.[0] || "10";
  return `${namePart}${offerNumber}`;
}

function collectFormValues() {
  const formData = new FormData(form);

  return {
    businessName: cleanValue(formData.get("businessName"), "Your Business"),
    businessType: cleanValue(formData.get("businessType"), "local business"),
    offer: cleanValue(formData.get("offer"), "a limited-time offer"),
    targetCustomer: cleanValue(formData.get("targetCustomer"), "nearby guests"),
    tone: cleanValue(formData.get("tone"), "Bold"),
    cta: cleanValue(formData.get("cta"), "Claim offer"),
    contact: cleanValue(formData.get("contact"), "Visit us today"),
    adSlotSize: cleanValue(formData.get("adSlotSize"), "Banner"),
  };
}

function generateAdLocally(inputs) {
  const copy = toneCopy[inputs.tone] || toneCopy.Bold;
  const couponCode = makeCouponCode(inputs.businessName, inputs.offer);

  return {
    businessName: inputs.businessName,
    adSlotSize: inputs.adSlotSize,
    headline: `${copy.headlinePrefix} ${inputs.businessName}`,
    subheadline: `${copy.subheadline} Perfect for ${inputs.targetCustomer}.`,
    offerText: `${inputs.offer} from your ${inputs.businessType} pick before the next round starts.`,
    ctaButtonText: inputs.cta,
    couponCode,
    disclaimer: `Mention ${couponCode}. Valid for same-browser demo only; business may set final terms.`,
    imagePrompt: `${copy.imageMood} advertisement for ${inputs.businessName}, a ${inputs.businessType}, featuring ${inputs.offer}, designed for a ${inputs.adSlotSize.toLowerCase()} ad slot in Stall Talk.`,
    contact: inputs.contact,
  };
}

function generateAdWithAI(inputs) {
  // Placeholder for a future OpenAI API integration.
  // Later, send `inputs` to a secure serverless endpoint that calls the OpenAI API.
  // The endpoint can return headline, subheadline, offer text, CTA, coupon code,
  // disclaimer, and image prompt; then this admin can render those returned fields.
  // Do not put private API keys in this GitHub Pages client-side JavaScript file.
  return generateAdLocally(inputs);
}

function currentGeneratedAd() {
  return {
    businessName: cleanValue(document.querySelector("#business-name").value, "Generated Sponsor"),
    adSlotSize: cleanValue(document.querySelector("#ad-slot-size").value, "Banner"),
    headline: cleanValue(outputFields.headline.value, "Generated headline"),
    subheadline: cleanValue(outputFields.subheadline.value, "Generated subheadline"),
    offerText: cleanValue(outputFields.offerText.value, "Generated offer"),
    ctaButtonText: cleanValue(outputFields.ctaButtonText.value, "Claim offer"),
    couponCode: cleanValue(outputFields.couponCode.value, "STALL10"),
    disclaimer: cleanValue(outputFields.disclaimer.value, "Terms may apply."),
    imagePrompt: cleanValue(outputFields.imagePrompt.value, "A colorful Stall Talk sponsor image."),
    contact: cleanValue(document.querySelector("#contact").value, "Visit us today"),
  };
}

function renderGeneratedAd(ad) {
  Object.entries(outputFields).forEach(([key, field]) => {
    field.value = ad[key] || "";
  });

  previewFields.kicker.textContent = `AI Ad Preview • ${ad.adSlotSize}`;
  previewFields.headline.textContent = ad.headline;
  previewFields.subheadline.textContent = ad.subheadline;
  previewFields.offer.textContent = ad.offerText;
  previewFields.cta.textContent = ad.ctaButtonText;
  previewFields.cta.href = ad.contact?.startsWith("http") ? ad.contact : "#";
  previewFields.disclaimer.textContent = `${ad.couponCode} • ${ad.disclaimer}`;

  previewCard.classList.remove(...Object.values(sizeClassByName));
  previewCard.classList.add(sizeClassByName[ad.adSlotSize] || sizeClassByName.Banner);
}

function readSavedSlots() {
  try {
    return JSON.parse(localStorage.getItem(AD_STORAGE_KEY)) || {};
  } catch (error) {
    console.warn("Unable to read saved Stall Talk ads", error);
    return {};
  }
}

function saveSlot(slotNumber, ad) {
  const savedSlots = readSavedSlots();
  savedSlots[slotNumber] = { ...ad, savedAt: new Date().toISOString() };
  localStorage.setItem(AD_STORAGE_KEY, JSON.stringify(savedSlots));
  saveStatus.textContent = `Saved “${ad.headline}” to Ad Slot ${slotNumber}. Open the public issue in this browser to see it.`;
}

function buildSlotButtons() {
  for (let slotNumber = 1; slotNumber <= 8; slotNumber += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${slotNumber}`;
    button.setAttribute("aria-label", `Apply generated ad to Ad Slot ${slotNumber}`);
    button.addEventListener("click", () => saveSlot(slotNumber, currentGeneratedAd()));
    slotButtons.append(button);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const generatedAd = generateAdWithAI(collectFormValues());
  renderGeneratedAd(generatedAd);
  saveStatus.textContent = "Ad generated. You can edit any field before applying it to a slot.";
});

Object.values(outputFields).forEach((field) => {
  field.addEventListener("input", () => renderGeneratedAd(currentGeneratedAd()));
});

document.querySelector("#ad-slot-size").addEventListener("change", () => {
  renderGeneratedAd(currentGeneratedAd());
});

buildSlotButtons();
renderGeneratedAd(currentGeneratedAd());
