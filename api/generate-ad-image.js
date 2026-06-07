function safeText(value, fallback = "") {
  return String(value || "").trim() || fallback;
}

function parseBody(req) {
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  return req.body || {};
}

function buildAgencyPrompt(payload) {
  const sponsorName = safeText(payload.sponsorName || payload.businessName, "Local Sponsor");
  const offer = safeText(payload.offer, "a limited-time local offer");
  const category = safeText(payload.category || payload.businessCategory, "local business");
  const city = safeText(payload.city, "the local market");
  const tone = safeText(payload.tone, "confident, friendly, premium");
  const callToAction = safeText(payload.callToAction || payload.cta || payload.ctaText, "Claim This Offer");
  const slot = safeText(payload.slot, "inline publication");

  return [
    `Create one finished agency-quality image advertisement for ${sponsorName}, a ${category} sponsor in ${city}.`,
    `Publication slot: ${slot}. Compose for a wide inline ad card that will be displayed at a 16:5 desktop ratio and cropped responsively to 4:3 on mobile; keep all key text and faces within the central safe area.`,
    `Campaign offer: ${offer}.`,
    `Tone: ${tone}.`,
    `Required readable text: sponsor name "${sponsorName}", headline based on "${offer}", supporting subheadline for ${city} readers, and CTA button text "${callToAction}".`,
    "Design direction: premium editorial advertising, bold clear hierarchy, strong contrast, commercial lighting, polished art direction, modern typography, tasteful color palette, generous spacing, and an obvious CTA button.",
    "Avoid watermarks, QR codes, lorem ipsum, placeholder copy, fake browser/app UI, messy collages, unreadable microcopy, and any extra invented brand logos unless they are abstract type treatments for the sponsor name.",
  ].join(" ");
}

function metadataFromPayload(payload, prompt) {
  const sponsorName = safeText(payload.sponsorName || payload.businessName, "Local Sponsor");
  const offer = safeText(payload.offer, "Limited-time offer");
  const callToAction = safeText(payload.callToAction || payload.cta || payload.ctaText, "Claim This Offer");

  return {
    sponsorName,
    offer,
    category: safeText(payload.category || payload.businessCategory, "local business"),
    city: safeText(payload.city, "local market"),
    tone: safeText(payload.tone, "premium"),
    callToAction,
    slot: safeText(payload.slot, "inline"),
    headline: safeText(payload.headline, offer),
    subheadline: safeText(payload.subheadline, `${sponsorName} brings this offer to local readers.`),
    model: "gpt-image-1",
    size: "1536x1024",
    promptLength: prompt.length,
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  let payload;
  try {
    payload = parseBody(req);
  } catch (error) {
    res.status(400).json({ error: `Invalid JSON body: ${error.message}` });
    return;
  }

  const sponsorName = safeText(payload.sponsorName || payload.businessName);
  const offer = safeText(payload.offer);
  if (!sponsorName || !offer) {
    res.status(400).json({ error: "sponsorName and offer are required." });
    return;
  }

  const prompt = buildAgencyPrompt(payload);
  const metadata = metadataFromPayload(payload, prompt);

  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ error: "OPENAI_API_KEY is not configured on the Vercel backend.", prompt, metadata });
    return;
  }

  try {
    const openAiResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        n: 1,
        size: "1536x1024",
        quality: process.env.OPENAI_IMAGE_QUALITY || "auto",
        output_format: "png",
      }),
    });

    const raw = await openAiResponse.text();
    const data = raw ? JSON.parse(raw) : {};

    if (!openAiResponse.ok) {
      res.status(openAiResponse.status).json({
        error: data?.error?.message || "OpenAI image generation failed.",
        prompt,
        metadata: { ...metadata, openAiStatusCode: openAiResponse.status },
      });
      return;
    }

    const imageBase64 = data?.data?.[0]?.b64_json || "";
    if (!imageBase64) {
      res.status(502).json({ error: "OpenAI returned no image data.", prompt, metadata });
      return;
    }

    res.status(200).json({
      imageBase64,
      prompt,
      metadata: {
        ...metadata,
        revisedPrompt: data?.data?.[0]?.revised_prompt || "",
      },
    });
  } catch (error) {
    console.error("generate-ad-image failed", error);
    res.status(500).json({ error: error.message || "Unable to generate ad image.", prompt, metadata });
  }
};

module.exports._private = { buildAgencyPrompt, metadataFromPayload };
