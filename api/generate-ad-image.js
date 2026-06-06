const AD_SIZES = {
  square: {
    label: "Square",
    description: "1024x1024 square social ad",
    width: 1024,
    height: 1024,
    dalleSize: "1024x1024",
    gptImageSize: "1024x1024",
  },
  tall: {
    label: "Tall",
    description: "1024x1792 tall portrait ad",
    width: 1024,
    height: 1792,
    dalleSize: "1024x1792",
    gptImageSize: "1024x1536",
  },
  banner: {
    label: "Banner",
    description: "1792x1024 wide hero banner ad",
    width: 1792,
    height: 1024,
    dalleSize: "1792x1024",
    gptImageSize: "1536x1024",
  },
  rail: {
    label: "Rail",
    description: "1024x1536 vertical sponsor rail ad",
    width: 1024,
    height: 1536,
    dalleSize: "1024x1792",
    gptImageSize: "1024x1536",
  },
  mobile: {
    label: "Mobile card",
    description: "1024x1024 mobile sponsor card ad",
    width: 1024,
    height: 1024,
    dalleSize: "1024x1024",
    gptImageSize: "1024x1024",
  },
  footer: {
    label: "Footer",
    description: "1792x512 footer banner ad safe area",
    width: 1792,
    height: 512,
    dalleSize: "1792x1024",
    gptImageSize: "1536x1024",
  },
};

function safeText(value, fallback = "") {
  return String(value || "").trim() || fallback;
}

const DEFAULT_ALLOWED_ORIGINS = ["https://clearmyrecord.github.io", "http://localhost:3000", "http://localhost:8080"];
const VALID_IMAGE_MODELS = new Set(["gpt-image-2", "gpt-image-1", "dall-e-3"]);

function setCorsHeaders(req, res) {
  const requestOrigin = req.headers?.origin;
  const configuredOrigins = safeText(process.env.ALLOWED_ORIGIN)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins = Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins]));
  const responseOrigin = allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];

  res.setHeader("Access-Control-Allow-Origin", responseOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function adSizeKey(value) {
  const normalized = safeText(value, "banner").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  if (normalized.includes("square")) return "square";
  if (normalized.includes("tall") || normalized.includes("portrait")) return "tall";
  if (normalized.includes("rail")) return "rail";
  if (normalized.includes("mobile") || normalized.includes("card")) return "mobile";
  if (normalized.includes("footer")) return "footer";
  return "banner";
}

function currentModel() {
  return safeText(process.env.OPENAI_IMAGE_MODEL, "gpt-image-2");
}

function diagnostic(model, overrides = {}) {
  return { apiStatus: "failed", openAiStatus: "unknown", model, ...overrides };
}

function validateBrief(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "JSON body must be an object.";
  if (!safeText(body.businessName)) return "Business name is required.";
  if (!safeText(body.offer)) return "Offer / promotion is required.";
  return "";
}

function openAiErrorType(status, data) {
  const message = safeText(data?.error?.message).toLowerCase();
  const code = safeText(data?.error?.code || data?.error?.type);
  if (status === 429 && (message.includes("billing") || message.includes("quota") || code.includes("insufficient_quota") || code.includes("hard_limit"))) return "billing_hard_limit";
  if (status === 429) return "rate_limit";
  if (message.includes("model") && (message.includes("does not exist") || message.includes("invalid"))) return "invalid_model";
  return code || "openai_api_error";
}

function brandColorText(body) {
  const colors = body.brandColors;
  if (Array.isArray(colors)) return colors.map((color) => safeText(color)).filter(Boolean).join(", ");
  if (typeof colors === "object" && colors) return Object.values(colors).map((color) => safeText(color)).filter(Boolean).join(", ");
  return safeText(colors || [body.primaryColor, body.secondaryColor, body.accentColor].filter(Boolean).join(", "), "coral, plum, warm cream");
}

function buildCopy(body) {
  const businessName = safeText(body.businessName, "Local Sponsor");
  const offer = safeText(body.offer, "a limited-time reader offer");
  const audience = safeText(body.audience || body.targetAudience, "nearby readers");
  const tone = safeText(body.tone || body.style, "bold").toLowerCase();
  const couponCode = safeText(body.couponCode || body.coupon, "");
  const ctaText = safeText(body.cta || body.ctaText || body.ctaButtonText, "Claim This Deal");

  return {
    headline: safeText(body.headline, `${businessName}: ${offer}`),
    subheadline: safeText(body.subheadline, `A ${tone} offer made for ${audience}.`),
    ctaText,
    couponCode,
    disclaimer: safeText(body.disclaimer, "Valid while supplies last. Terms may apply."),
  };
}

function buildPrompt(body, sizeKey, copy) {
  const size = AD_SIZES[sizeKey];
  const businessName = safeText(body.businessName, "a local business");
  const category = safeText(body.businessCategory || body.category, "local business");
  const offer = safeText(body.offer, "limited-time offer");
  const audience = safeText(body.audience || body.targetAudience, "nearby customers");
  const tone = safeText(body.tone || body.style, "bold");
  const visualStyle = safeText(body.visualStyle || body.template, "polished modern editorial ad");
  const website = safeText(body.website || body.targetUrl, "not provided");
  const phone = safeText(body.phone, "not provided");
  const venueVibe = [body.venueTargeting, body.cityTargeting || body.city, body.stateTargeting || body.state].map((item) => safeText(item)).filter(Boolean).join(", ") || "local venue/city vibe";
  const requiredText = safeText(body.requiredText, "none beyond business name, offer, CTA, and coupon if provided");
  const disclaimer = safeText(body.optionalDisclaimer || body.disclaimer, "none");
  const optionalLogoUrl = safeText(body.optionalLogoUrl || body.logoUrl, "not provided");
  const colors = brandColorText(body);
  const footerInstruction = sizeKey === "footer"
    ? "This is for a footer slot: compose inside a centered horizontal safe area and avoid placing key text near the top or bottom crop edges."
    : "";

  return safeText(body.prompt, [
    `Create one finished, production-ready graphic advertisement for ${businessName}, a ${category}.`,
    `Canvas intent: ${size.description}.`,
    `Audience: ${audience}. Tone: ${tone}. Visual style: ${visualStyle}.`,
    `Venue/city vibe to evoke: ${venueVibe}.`,
    `Brand colors to use: ${colors}.`,
    `Primary offer: ${offer}. Coupon code: ${copy.couponCode || "omit coupon code"}.`,
    `Use this exact headline text if possible: "${copy.headline}".`,
    `Use this supporting line if possible: "${copy.subheadline}".`,
    `Use this CTA text if possible: "${copy.ctaText}".`,
    `Include required text: ${requiredText}. Optional disclaimer: ${disclaimer}.`,
    `Include contact details only if they fit cleanly: website ${website}; phone ${phone}.`,
    `Logo reference URL if available: ${optionalLogoUrl}. Do not invent a real logo for a trademarked brand if no logo is supplied; use tasteful type treatment instead.`,
    footerInstruction,
    "Create a finished professional graphic ad, not a mockup, website card, wireframe, screenshot, or template preview.",
    "Use high contrast, readable typography, strong hierarchy, clean spacing, mobile-friendly layout, and commercial advertisement quality.",
    "No placeholder text, no lorem ipsum, no fake QR codes, no unreadable microcopy.",
  ].filter(Boolean).join(" "));
}

function imageRequestBody({ model, prompt, size }) {
  const body = {
    model,
    prompt,
    n: 1,
    size: model.startsWith("gpt-image") ? size.gptImageSize : size.dalleSize,
  };

  if (model.startsWith("gpt-image")) {
    body.quality = process.env.OPENAI_IMAGE_QUALITY || "auto";
    body.output_format = process.env.OPENAI_IMAGE_OUTPUT_FORMAT || "png";
  } else {
    body.quality = process.env.OPENAI_IMAGE_QUALITY || "standard";
    body.response_format = process.env.OPENAI_IMAGE_RESPONSE_FORMAT || "b64_json";
  }

  return body;
}

module.exports = async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method === "GET") {
    const model = currentModel();
    res.status(200).json({ apiStatus: "ok", openAiStatus: process.env.OPENAI_API_KEY ? "configured" : "not_configured", model, modelValid: VALID_IMAGE_MODELS.has(model) });
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    res.status(405).json({ error: "Method not allowed", diagnostic: diagnostic(currentModel(), { errorType: "method_not_allowed" }) });
    return;
  }

  try {
    let body;
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    } catch (error) {
      console.error("generate-ad-image request JSON parse error", error);
      res.status(400).json({ error: `Request JSON parse error: ${error.message}`, diagnostic: { apiStatus: "failed", openAiStatus: "unknown", errorType: "json_parse_error" } });
      return;
    }
    const validationError = validateBrief(body);
    const model = currentModel();
    if (validationError) {
      res.status(400).json({ error: validationError, diagnostic: diagnostic(model, { errorType: "invalid_input" }) });
      return;
    }

    const sizeKey = adSizeKey(body.adSizeKey || body.adSize);
    const size = AD_SIZES[sizeKey];
    const copy = buildCopy(body);
    const promptUsed = buildPrompt(body, sizeKey, copy);

    if (!process.env.OPENAI_API_KEY) {
      console.error("generate-ad-image missing OPENAI_API_KEY");
      res.status(500).json({
        error: "OPENAI_API_KEY is not configured on the Vercel backend.",
        diagnostic: { apiStatus: "failed", openAiStatus: "not_configured", model, errorType: "missing_api_key" },
        promptUsed,
        ...copy,
      });
      return;
    }

    if (!VALID_IMAGE_MODELS.has(model)) {
      res.status(500).json({ error: `Invalid OpenAI image model "${model}".`, diagnostic: diagnostic(model, { openAiStatus: "failed", errorType: "invalid_model" }), promptUsed, ...copy });
      return;
    }

    const requestBody = imageRequestBody({ model, prompt: promptUsed, size });

    const openAiResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const raw = await openAiResponse.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch (error) {
      console.error("generate-ad-image OpenAI JSON parse error", { status: openAiResponse.status, error, raw: raw.slice(0, 500) });
      res.status(502).json({ error: `OpenAI JSON parse error: ${error.message}`, diagnostic: { apiStatus: "failed", openAiStatus: "failed", model, errorType: "openai_json_parse_error", openAiStatusCode: openAiResponse.status } });
      return;
    }

    if (!openAiResponse.ok) {
      const rawMessage = data?.error?.message || "OpenAI image generation failed.";
      const errorType = openAiErrorType(openAiResponse.status, data);
      const message = errorType === "billing_hard_limit" ? "OpenAI billing limit reached. Update billing in OpenAI Platform." : rawMessage;
      console.error("generate-ad-image OpenAI API error", { status: openAiResponse.status, model, message, errorType });
      res.status(openAiResponse.status).json({
        error: message,
        diagnostic: { apiStatus: "failed", openAiStatus: "failed", model, errorType, openAiStatusCode: openAiResponse.status, rateLimited: errorType === "rate_limit" },
        promptUsed,
        ...copy,
      });
      return;
    }

    const image = data?.data?.[0] || {};
    const imageBase64 = image.b64_json || "";
    const imageUrl = image.url || (imageBase64 ? `data:image/png;base64,${imageBase64}` : "");

    if (!imageUrl) {
      res.status(502).json({ error: "OpenAI returned success without image data.", diagnostic: diagnostic(model, { openAiStatus: "failed", errorType: "missing_image_data" }), promptUsed, ...copy });
      return;
    }

    res.status(200).json({
      imageUrl,
      imageBase64,
      promptUsed,
      headline: copy.headline,
      subheadline: copy.subheadline,
      ctaText: copy.ctaText,
      cta: copy.ctaText,
      couponCode: copy.couponCode,
      disclaimer: copy.disclaimer,
      requestedSize: size.label,
      requestedWidth: size.width,
      requestedHeight: size.height,
      openAiSize: requestBody.size,
      revisedPrompt: image.revised_prompt || "",
      model,
      diagnostic: { apiStatus: "ok", openAiStatus: "connected", model },
    });
  } catch (error) {
    console.error("generate-ad-image Vercel function/fetch failed", error);
    res.status(500).json({ error: error.message || "Unable to generate image ad.", diagnostic: { apiStatus: "failed", openAiStatus: "failed", model: currentModel(), errorType: "vercel_function_or_fetch_error" } });
  }
};

module.exports._private = { adSizeKey, brandColorText, buildCopy, buildPrompt, imageRequestBody };
