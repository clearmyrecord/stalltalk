const STALLTALK_AD_STORAGE_KEY = "stalltalk_ad_slots";
const STALLTALK_DRAFT_STORAGE_KEY = "stalltalk_content_draft";

const STALLTALK_AD_SIZES = {
  square: { label: "Square 1024x1024", imageSize: "1024x1024" },
  tall: { label: "Tall 1024x1792", imageSize: "1024x1792" },
  banner: { label: "Banner 1792x1024", imageSize: "1792x1024" },
  footer: { label: "Footer banner 1792x512", imageSize: "1792x512" },
};

const STALLTALK_TEMPLATE_NAMES = {
  vegas: "Vegas Neon",
  coupon: "Coupon Blast",
  luxury: "Luxury Black Gold",
  family: "Family Fun",
  contractor: "Contractor Pro",
  event: "Event Promo",
};

function stallTalkSafeText(value, fallback = "") {
  return String(value || "").trim() || fallback;
}

function stallTalkNormalizeUrl(value) {
  const url = stallTalkSafeText(value);
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

function stallTalkContactHref(ad) {
  const website = stallTalkNormalizeUrl(ad.website);
  if (website) return website;

  const phone = stallTalkSafeText(ad.phone);
  if (/^[+\d][\d\s().-]+$/.test(phone)) return `tel:${phone.replace(/\s/g, "")}`;

  return "#sponsor-wall";
}

function stallTalkClassToken(value, fallback) {
  return stallTalkSafeText(value, fallback).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || fallback;
}

function stallTalkAdSizeKey(value) {
  const key = stallTalkClassToken(value, "banner");
  if (STALLTALK_AD_SIZES[key]) return key;
  if (key.includes("square")) return "square";
  if (key.includes("tall") || key.includes("portrait")) return "tall";
  if (key.includes("footer")) return "footer";
  return "banner";
}

function stallTalkImageSource(ad) {
  const imageAdUrl = stallTalkSafeText(ad.imageAdUrl || ad.imageUrl);
  const imageAdBase64 = stallTalkSafeText(ad.imageAdBase64 || ad.b64_json);
  if (imageAdUrl) return imageAdUrl;
  if (!imageAdBase64) return "";
  return imageAdBase64.startsWith("data:") ? imageAdBase64 : `data:image/png;base64,${imageAdBase64}`;
}

function stallTalkBuildGraphicAd(ad, options = {}) {
  const slotNumber = options.slotNumber ? `Slot ${options.slotNumber}` : STALLTALK_TEMPLATE_NAMES[ad.template] || "Graphic Ad";
  const size = stallTalkAdSizeKey(ad.adSizeKey || ad.adSize);
  const template = stallTalkClassToken(ad.template, "vegas");
  const primary = stallTalkSafeText(ad.primaryColor, "#ff2d2d");
  const secondary = stallTalkSafeText(ad.secondaryColor, "#ffd400");
  const accent = stallTalkSafeText(ad.accentColor, "#7c2cff");
  const imageSource = ad.adMode === "image" ? stallTalkImageSource(ad) : "";
  const wrapper = document.createElement(options.link === false ? "div" : "a");

  wrapper.className = `graphic-ad graphic-template-${template} graphic-size-${size}${imageSource ? " graphic-ad-image" : ""}${options.compact ? " graphic-ad-compact" : ""}`;
  wrapper.style.setProperty("--graphic-primary", primary);
  wrapper.style.setProperty("--graphic-secondary", secondary);
  wrapper.style.setProperty("--graphic-accent", accent);
  wrapper.setAttribute("aria-label", `${stallTalkSafeText(ad.businessName, "Sponsor")} advertisement`);

  if (wrapper.tagName === "A") {
    wrapper.href = stallTalkContactHref(ad);
    wrapper.target = wrapper.href.startsWith("http") ? "_blank" : "";
    wrapper.rel = wrapper.href.startsWith("http") ? "noopener" : "";
  }

  if (imageSource) {
    const img = document.createElement("img");
    img.className = "graphic-generated-image";
    img.src = imageSource;
    img.alt = `${stallTalkSafeText(ad.businessName, "Sponsor")} ${stallTalkSafeText(ad.offer, "advertisement")}`;
    wrapper.append(img);
    return wrapper;
  }

  const shapes = document.createElement("div");
  shapes.className = "graphic-shapes";
  shapes.setAttribute("aria-hidden", "true");
  shapes.innerHTML = "<span></span><span></span><span></span><span></span>";

  const top = document.createElement("div");
  top.className = "graphic-topline";
  const slot = document.createElement("span");
  slot.textContent = slotNumber;
  const category = document.createElement("span");
  category.textContent = stallTalkSafeText(ad.businessCategory, "Local Favorite");
  top.append(slot, category);

  const logo = document.createElement("div");
  logo.className = "graphic-logo";
  const imageUrl = stallTalkSafeText(ad.imageUrl);
  if (imageUrl) {
    const img = document.createElement("img");
    img.src = imageUrl;
    img.alt = `${stallTalkSafeText(ad.businessName, "Business")} logo or featured image`;
    img.crossOrigin = "anonymous";
    logo.append(img);
  } else {
    logo.textContent = stallTalkSafeText(ad.businessName, "AD").slice(0, 2).toUpperCase();
  }

  const body = document.createElement("div");
  body.className = "graphic-body";

  const name = document.createElement("p");
  name.className = "graphic-business";
  name.textContent = stallTalkSafeText(ad.businessName, "Your Business");

  const headline = document.createElement("h3");
  headline.className = "graphic-headline";
  headline.textContent = stallTalkSafeText(ad.headline, "A Deal Worth Stopping For");

  const audience = document.createElement("p");
  audience.className = "graphic-audience";
  audience.textContent = stallTalkSafeText(ad.subheadline, "Made for nearby customers ready to act.");

  const offer = document.createElement("div");
  offer.className = "graphic-offer-badge";
  const offerLabel = document.createElement("span");
  offerLabel.textContent = "Offer";
  const offerText = document.createElement("strong");
  offerText.textContent = stallTalkSafeText(ad.offer, "Limited-time special");
  offer.append(offerLabel, offerText);

  const coupon = document.createElement("div");
  coupon.className = "graphic-coupon";
  coupon.innerHTML = "<span>Use code</span>";
  const couponCode = document.createElement("strong");
  couponCode.textContent = stallTalkSafeText(ad.couponCode, "STALL10");
  coupon.append(couponCode);

  const cta = document.createElement("span");
  cta.className = "graphic-cta";
  cta.textContent = stallTalkSafeText(ad.ctaButtonText, "Claim This Deal");

  const contact = document.createElement("p");
  contact.className = "graphic-contact";
  contact.textContent = [stallTalkSafeText(ad.phone), stallTalkSafeText(ad.website)].filter(Boolean).join(" • ") || "Ask for details today";

  body.append(name, headline, audience, offer, coupon, cta, contact);
  wrapper.append(shapes, top, logo, body);

  return wrapper;
}

window.StallTalkGraphicAds = {
  storageKey: STALLTALK_AD_STORAGE_KEY,
  draftStorageKey: STALLTALK_DRAFT_STORAGE_KEY,
  templates: STALLTALK_TEMPLATE_NAMES,
  sizes: STALLTALK_AD_SIZES,
  adSizeKey: stallTalkAdSizeKey,
  imageSource: stallTalkImageSource,
  build: stallTalkBuildGraphicAd,
  safeText: stallTalkSafeText,
  normalizeUrl: stallTalkNormalizeUrl,
};
