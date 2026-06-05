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

function setCorsHeaders(req, res) {
  const requestOrigin = req.headers?.origin;
  const configuredOrigins = safeText(process.env.ALLOWED_ORIGIN, "*")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowAllOrigins = configuredOrigins.includes("*");
  const responseOrigin = allowAllOrigins
    ? "*"
    : configuredOrigins.includes(requestOrigin)
      ? requestOrigin
      : configuredOrigins[0];

  res.setHeader("Access-Control-Allow-Origin", responseOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function adSizeKey(value) {
  const normalized = safeText(value, "banner").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  if (normalized.includes("square")) return "square";
  if (normalized.includes("tall") || normalized.includes("portrait")) return "tall";
  if (normalized.includes("footer")) return "footer";
  return "banner";
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
  const couponCode = safeText(body.couponCode || body.coupon, `${businessName.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase() || "STALL"}10`);
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
  const website = safeText(body.website, "not provided");
  const phone = safeText(body.phone, "not provided");
  const optionalLogoUrl = safeText(body.optionalLogoUrl || body.logoUrl, "not provided");
  const colors = brandColorText(body);
  const footerInstruction = sizeKey === "footer"
    ? "This is for a footer slot: compose inside a centered horizontal safe area and avoid placing key text near the top or bottom crop edges."
    : "";

  return safeText(body.prompt, [
    `Create one finished, production-ready graphic advertisement for ${businessName}, a ${category}.`,
    `Canvas intent: ${size.description}.`,
    `Audience: ${audience}. Tone: ${tone}. Visual style: ${visualStyle}.`,
    `Brand colors to use: ${colors}.`,
    `Primary offer: ${offer}. Coupon code: ${copy.couponCode}.`,
    `Use this exact headline text if possible: "${copy.headline}".`,
    `Use this supporting line if possible: "${copy.subheadline}".`,
    `Use this CTA text if possible: "${copy.ctaText}".`,
    `Include contact details only if they fit cleanly: website ${website}; phone ${phone}.`,
    `Logo reference URL if available: ${optionalLogoUrl}. Do not invent a real logo for a trademarked brand if no logo is supplied; use tasteful type treatment instead.`,
    footerInstruction,
    "Make it look like a finished agency-produced ad, not a website card, wireframe, screenshot, or template mockup.",
    "Use high contrast, readable promotional typography, strong hierarchy, clean spacing, and no extra placeholder text.",
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

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    res.status(405).json({ error: "Method not allowed" });
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
    const sizeKey = adSizeKey(body.adSizeKey || body.adSize);
    const size = AD_SIZES[sizeKey];
    const copy = buildCopy(body);
    const promptUsed = buildPrompt(body, sizeKey, copy);

    if (!process.env.OPENAI_API_KEY) {
      console.error("generate-ad-image missing OPENAI_API_KEY");
      res.status(500).json({
        error: "OPENAI_API_KEY is not configured on the Vercel backend.",
        diagnostic: { apiStatus: "failed", openAiStatus: "not_configured", model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5", errorType: "missing_api_key" },
        promptUsed,
        ...copy,
      });
      return;
    }

    const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5";
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
      const message = data?.error?.message || "OpenAI image generation failed.";
      console.error("generate-ad-image OpenAI API error", { status: openAiResponse.status, model, message });
      res.status(openAiResponse.status).json({
        error: message,
        diagnostic: { apiStatus: "failed", openAiStatus: "failed", model, errorType: openAiResponse.status === 429 ? "rate_limit" : data?.error?.type || "openai_api_error", openAiStatusCode: openAiResponse.status, rateLimited: openAiResponse.status === 429 },
        promptUsed,
        ...copy,
      });
      return;
    }

    const image = data?.data?.[0] || {};
    const imageBase64 = image.b64_json || "";
    const imageUrl = image.url || (imageBase64 ? `data:image/png;base64,${imageBase64}` : "");

    res.status(200).json({
      imageUrl,
      imageBase64,
      promptUsed,
      headline: copy.headline,
      subheadline: copy.subheadline,
      ctaText: copy.ctaText,
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
    res.status(500).json({ error: error.message || "Unable to generate image ad.", diagnostic: { apiStatus: "failed", openAiStatus: "failed", model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5", errorType: "vercel_function_or_fetch_error" } });
  }
};

module.exports._private = { adSizeKey, brandColorText, buildCopy, buildPrompt, imageRequestBody };
