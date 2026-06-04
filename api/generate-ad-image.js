const AD_SIZES = {
  square: {
    label: "Square 1024x1024",
    width: 1024,
    height: 1024,
    dalleSize: "1024x1024",
    gptImageSize: "1024x1024",
  },
  tall: {
    label: "Tall 1024x1792",
    width: 1024,
    height: 1792,
    dalleSize: "1024x1792",
    gptImageSize: "1024x1536",
  },
  banner: {
    label: "Banner 1792x1024",
    width: 1792,
    height: 1024,
    dalleSize: "1792x1024",
    gptImageSize: "1536x1024",
  },
  footer: {
    label: "Footer banner 1792x512",
    width: 1792,
    height: 512,
    dalleSize: "1792x1024",
    gptImageSize: "1536x1024",
  },
};

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

function safeText(value, fallback = "") {
  return String(value || "").trim() || fallback;
}

function adSizeKey(value) {
  const normalized = safeText(value, "banner").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  if (normalized.includes("square")) return "square";
  if (normalized.includes("tall") || normalized.includes("portrait")) return "tall";
  if (normalized.includes("footer")) return "footer";
  return "banner";
}

function buildPrompt(body, size) {
  const footerInstruction = size === "footer"
    ? "Design the final creative as a 1792x512 footer banner safe area. Keep every logo, headline, coupon, CTA, phone number, and website inside the centered horizontal footer band so it remains intact when displayed at 1792x512."
    : "";

  return safeText(body.prompt, [
    `Create a finished image advertisement for ${safeText(body.businessName, "a local business")}.`,
    `Business category: ${safeText(body.businessCategory, "local business")}.`,
    `Offer: ${safeText(body.offer, "limited-time offer")}.`,
    `Style: ${safeText(body.style || body.tone, "bold")}.`,
    `Target audience: ${safeText(body.targetAudience, "nearby customers")}.`,
    `Coupon: ${safeText(body.couponCode || body.coupon, "STALL10")}.`,
    `Phone: ${safeText(body.phone, "not provided")}. Website: ${safeText(body.website, "not provided")}.`,
    `Use readable promotional typography, a clear call to action, polished ad composition, and colors inspired by ${safeText(body.primaryColor, "red")}, ${safeText(body.secondaryColor, "yellow")}, and ${safeText(body.accentColor, "purple")}.`,
    footerInstruction,
    "Return only the final ad image, not a mockup or template explanation.",
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

  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ error: "OPENAI_API_KEY is not configured on the Vercel backend." });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const sizeKey = adSizeKey(body.adSizeKey || body.adSize);
    const size = AD_SIZES[sizeKey];
    const prompt = buildPrompt(body, sizeKey);
    const model = process.env.OPENAI_IMAGE_MODEL || "dall-e-3";
    const requestBody = imageRequestBody({ model, prompt, size });

    const openAiResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await openAiResponse.json();

    if (!openAiResponse.ok) {
      res.status(openAiResponse.status).json({
        error: data?.error?.message || "OpenAI image generation failed.",
      });
      return;
    }

    const image = data?.data?.[0] || {};
    res.status(200).json({
      imageBase64: image.b64_json || "",
      imageUrl: image.url || "",
      prompt,
      size: requestBody.size,
      requestedSize: size.label,
      requestedWidth: size.width,
      requestedHeight: size.height,
      revisedPrompt: image.revised_prompt || "",
      model,
    });
  } catch (error) {
    console.error("generate-ad-image failed", error);
    res.status(500).json({ error: "Unable to generate image ad." });
  }
};
