const ALLOWED_ORIGINS = new Set([
  "https://stalltalk.vercel.app",
  "https://clearmyrecord.github.io",
  "http://localhost:3000",
  "http://localhost:8080",
]);

function corsHeaders(req) {
  const origin = req.headers?.origin;
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://stalltalk.vercel.app",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function sendJson(req, res, status, payload) {
  Object.entries(corsHeaders(req)).forEach(([key, value]) => res.setHeader(key, value));
  return res.status(status).json(payload);
}

function text(value, fallback = "") {
  return String(value ?? "").trim() || fallback;
}

function clamp(value, max = 400) {
  const normalized = text(value).replace(/\s+/g, " ");
  return normalized.length > max ? `${normalized.slice(0, max - 1).trim()}…` : normalized;
}

function normalizeSlot(value) {
  const slot = Number(value || 1);
  return Number.isFinite(slot) ? Math.min(8, Math.max(1, Math.round(slot))) : 1;
}

function normalizeImageBase64(value) {
  const raw = text(value);
  if (!raw) return "";
  const comma = raw.indexOf(",");
  return raw.startsWith("data:") && comma >= 0 ? raw.slice(comma + 1) : raw;
}

function logoInstruction(body) {
  if (text(body.logoBase64)) {
    return "A private uploaded logo was included in the request. Use it only as brand inspiration: preserve the brand feel, color relationships, and logo-like visual language without exposing a public logo URL.";
  }
  if (text(body.logoUrl)) {
    return `Use this provided logo URL as visual brand inspiration only if accessible: ${clamp(body.logoUrl, 240)}. Do not invent unrelated branding.`;
  }
  return "No logo was provided; do not invent a fake logo or use copyrighted logos.";
}

function adFormatForSize(adSize) {
  const normalized = text(adSize, "Inline banner").toLowerCase();
  if (normalized.includes("mobile")) {
    return { adSize: "Mobile card", imageSize: "1024x1536", layout: "vertical mobile card ad, phone-first portrait layout" };
  }
  if (normalized.includes("tall")) {
    return { adSize: "Tall", imageSize: "1024x1536", layout: "vertical tall ad, portrait layout" };
  }
  if (normalized.includes("square")) {
    return { adSize: "Square", imageSize: "1024x1024", layout: "square ad layout" };
  }
  if (normalized.includes("banner")) {
    return { adSize: normalized.includes("inline") ? "Inline banner" : "Banner", imageSize: "1536x1024", layout: "horizontal mobile inline banner ad, wide layout, readable on phone, no square poster composition" };
  }
  return { adSize: "Inline banner", imageSize: "1536x1024", layout: "horizontal mobile inline banner ad, wide layout, readable on phone, no square poster composition" };
}

function buildPrompt(body) {
  const businessName = clamp(body.businessName || body.sponsorName, 80) || "Local Sponsor";
  const businessCategory = clamp(body.businessCategory || body.category, 80) || "Local Business";
  const creativeBrief = clamp(body.creativeBrief || body.brief || body.prompt, 900) || "Create a high-converting local sponsor advertisement.";
  const offer = clamp(body.offer || body.headline, 160) || "Featured local offer";
  const couponCode = clamp(body.couponCode, 40);
  const ctaText = clamp(body.ctaText || body.cta || body.callToAction, 60) || "Claim Offer";
  const website = clamp(body.website || body.targetUrl, 140);
  const phone = clamp(body.phone || body.phoneNumber, 60);
  const targetAudience = clamp(body.targetAudience || body.audience, 180) || "nearby restroom publication readers";
  const city = clamp(body.cityTargeting || body.city, 80);
  const state = clamp(body.stateTargeting || body.state, 40).toUpperCase();
  const venue = clamp(body.venueTargeting || body.venue, 120);
  const brandColors = clamp(body.brandColors, 160) || "premium high-contrast brand colors";
  const tone = clamp(body.tone, 120) || "bold, polished, persuasive, premium";
  const visualStyle = clamp(body.visualStyle, 180) || "agency-quality commercial ad with polished photography and clean graphic design";
  const requiredText = clamp(body.requiredText, 240);
  const optionalDisclaimer = clamp(body.optionalDisclaimer || body.disclaimer, 240);
  const slot = normalizeSlot(body.slot);
  const adFormat = adFormatForSize(body.adSize);

  const prompt = [
    "Create a finished agency-quality advertisement image for Potty Favor / Stall Talk restroom publication ad inventory.",
    `Format: ${adFormat.layout}. Premium sponsor graphic, mobile-first, readable at small sizes, suitable for one of 8 publication ad slots, no homepage layout mockups.`,
    "Make the headline, offer, CTA, phone number, and coupon code large enough to read on a phone; use bold typography, high contrast, and uncluttered spacing.",
    `Ad slot selected: ${slot}. Business name: ${businessName}. Business category: ${businessCategory}.`,
    `Creative brief: ${creativeBrief}`,
    `Primary offer/promotion headline: ${offer}.`,
    couponCode ? `Coupon code to include in a clean badge: ${couponCode}.` : "No coupon code was provided; do not invent one.",
    `CTA text to include: ${ctaText}.`,
    website ? `Website/landing page text, if legible: ${website}.` : "No website text required.",
    phone ? `Phone number text, if legible: ${phone}.` : "No phone text required.",
    `Target audience: ${targetAudience}. Geographic/venue context: ${[venue, city, state].filter(Boolean).join(", ") || "global local market"}.`,
    `Brand colors: ${brandColors}. Tone: ${tone}. Visual style: ${visualStyle}.`,
    requiredText ? `Required text that should appear exactly if it remains readable: ${requiredText}.` : "Only include intentional readable ad copy; avoid filler text.",
    optionalDisclaimer ? `Optional disclaimer, only if legible without clutter: ${optionalDisclaimer}.` : "Avoid tiny legal microcopy unless specifically requested.",
    logoInstruction(body),
    "Composition guidance: strong visual hierarchy, large readable headline, brand name area, clear CTA button, polished lighting, premium color grading, clean spacing, eye-catching local advertising agency finish.",
    "Safety/quality: no fake QR codes, no watermarks, no lorem ipsum, no broken text, no misspellings, no copyrighted logos unless provided, no UI screenshots, no mockup frames, no clutter. Return publish-ready ad artwork only.",
  ].join("\n");

  return { prompt, metadata: { businessName, businessCategory, offer, couponCode, ctaText, website, phone, targetAudience, city, state, venue, brandColors, tone, visualStyle, slot, adSize: adFormat.adSize, imageSize: adFormat.imageSize, layout: adFormat.layout, logoProvided: Boolean(text(body.logoBase64) || text(body.logoUrl)) } };
}

async function readOpenAiJson(response) {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    return { error: { message: `OpenAI returned invalid JSON: ${error.message}` }, raw: raw.slice(0, 500) };
  }
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    Object.entries(corsHeaders(req)).forEach(([key, value]) => res.setHeader(key, value));
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return sendJson(req, res, 405, { ok: false, error: "Method Not Allowed. Use POST." });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return sendJson(req, res, 500, { ok: false, error: "OPENAI_API_KEY is not configured in the Vercel server environment." });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    if (!text(body.businessName || body.sponsorName)) {
      return sendJson(req, res, 400, { ok: false, error: "Business name is required." });
    }
    if (!text(body.creativeBrief || body.brief || body.prompt)) {
      return sendJson(req, res, 400, { ok: false, error: "Creative brief is required." });
    }
    if (!text(body.offer || body.headline)) {
      return sendJson(req, res, 400, { ok: false, error: "Offer / promotion is required." });
    }

    const { prompt, metadata } = buildPrompt(body);
    const model = text(body.openAiImageModel || process.env.OPENAI_IMAGE_MODEL, "gpt-image-1");

    const openaiResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        n: 1,
        size: metadata.imageSize,
        quality: text(process.env.OPENAI_IMAGE_QUALITY, "medium"),
        output_format: text(process.env.OPENAI_IMAGE_OUTPUT_FORMAT, "png"),
      }),
    });

    const data = await readOpenAiJson(openaiResponse);
    const requestId = openaiResponse.headers.get("x-request-id");

    if (!openaiResponse.ok) {
      const message = text(data?.error?.message, `OpenAI image generation failed with HTTP ${openaiResponse.status}.`);
      return sendJson(req, res, openaiResponse.status, {
        ok: false,
        error: message,
        prompt,
        metadata: { ...metadata, model, requestId, logoBase64Received: Boolean(normalizeImageBase64(body.logoBase64)) },
        details: data?.error || data,
      });
    }

    const image = data?.data?.[0] || {};
    const imageBase64 = normalizeImageBase64(image.b64_json || image.image_base64 || image.imageBase64);

    if (!imageBase64) {
      return sendJson(req, res, 502, {
        ok: false,
        error: "OpenAI returned a successful response without base64 image data.",
        prompt,
        metadata: { ...metadata, model, requestId },
      });
    }

    return sendJson(req, res, 200, {
      ok: true,
      imageBase64,
      prompt: image.revised_prompt || prompt,
      promptUsed: image.revised_prompt || prompt,
      metadata: { ...metadata, model, requestId, logoBase64Received: Boolean(normalizeImageBase64(body.logoBase64)) },
    });
  } catch (error) {
    return sendJson(req, res, 500, {
      ok: false,
      error: error?.message || "Image generation failed.",
    });
  }
}
