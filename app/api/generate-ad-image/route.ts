import { NextResponse } from "next/server";

type AdSize = "Banner" | "Square" | "Tall" | "Footer";

const sizeMap: Record<AdSize, { apiSize: string; composition: string }> = {
  Banner: { apiSize: "1536x1024", composition: "wide banner advertisement with large central headline and horizontal CTA safe area" },
  Square: { apiSize: "1024x1024", composition: "square social-style advertisement with balanced headline, product atmosphere, and CTA" },
  Tall: { apiSize: "1024x1536", composition: "tall mobile advertisement with vertical hierarchy, clear offer, and bottom CTA" },
  Footer: { apiSize: "1536x1024", composition: "slim footer-strip advertisement composed inside a centered horizontal band with no important text near edges" }
};

function safe(value: unknown, fallback: string) {
  return String(value || "").trim() || fallback;
}

function normalizeSize(value: unknown): AdSize {
  const normalized = safe(value, "Banner").toLowerCase();
  if (normalized.includes("square")) return "Square";
  if (normalized.includes("tall")) return "Tall";
  if (normalized.includes("footer")) return "Footer";
  return "Banner";
}

function couponFor(businessName: string, couponCode: string) {
  return couponCode || `${businessName.replace(/[^a-z0-9]/gi, "").slice(0, 5).toUpperCase() || "STALL"}15`;
}

function buildCopy(body: Record<string, unknown>) {
  const businessName = safe(body.businessName, "Your Business");
  const offer = safe(body.offer, "Limited-time offer");
  const audience = safe(body.audience, "nearby customers");
  const ctaText = safe(body.ctaText, "Claim Offer");
  const couponCode = couponFor(businessName, safe(body.couponCode, ""));
  const headline = offer.length <= 30 ? offer : `${businessName} Deal`;
  const subheadline = `${businessName} for ${audience}`;
  return { businessName, offer, audience, ctaText, couponCode, headline, subheadline };
}

function buildPrompt(body: Record<string, unknown>, adSize: AdSize) {
  const copy = buildCopy(body);
  const category = safe(body.category, "local business");
  const tone = safe(body.tone, "Professional");
  const visualStyle = safe(body.visualStyle, "Vegas Neon");
  const website = safe(body.website, "");
  const phone = safe(body.phone, "");
  const brandColors = safe(body.brandColors, "brand-appropriate high contrast colors");
  const size = sizeMap[adSize];

  return {
    ...copy,
    promptUsed: [
      `Create a finished professional marketing graphic advertisement for ${copy.businessName}.`,
      `Business category: ${category}. Offer: ${copy.offer}. Audience: ${copy.audience}.`,
      `Tone: ${tone}. Visual style: ${visualStyle}. Brand colors: ${brandColors}.`,
      `Ad size: ${adSize}; composition: ${size.composition}.`,
      `Use readable, large ad typography with headline "${copy.headline}", subheadline "${copy.subheadline}", CTA "${copy.ctaText}", and coupon code "${copy.couponCode}".`,
      website ? `Include website ${website} only if it remains readable.` : "",
      phone ? `Include phone ${phone} only if it remains readable.` : "",
      "Return a polished final advertisement image, not a mockup, not a screenshot, and not a design explanation. Avoid tiny unreadable copy."
    ].filter(Boolean).join(" ")
  };
}

function fallbackSvg(body: Record<string, unknown>, adSize: AdSize, error: string) {
  const copy = buildCopy(body);
  const brandColors = safe(body.brandColors, "#ff2d55,#ffd400,#5b2cff").split(",").map((color) => color.trim()).filter(Boolean);
  const [primary = "#ff2d55", secondary = "#ffd400", accent = "#5b2cff"] = brandColors;
  const prompt = buildPrompt(body, adSize).promptUsed;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${primary}"/><stop offset=".55" stop-color="${accent}"/><stop offset="1" stop-color="#101014"/></linearGradient></defs><rect width="1200" height="700" rx="48" fill="url(#g)"/><circle cx="1030" cy="130" r="170" fill="${secondary}" opacity=".9"/><text x="72" y="130" font-family="Arial Black,Arial" font-size="44" fill="white">${copy.businessName.toUpperCase()}</text><text x="72" y="304" font-family="Arial Black,Arial" font-size="88" fill="${secondary}">${copy.headline.toUpperCase()}</text><text x="76" y="390" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="white">${copy.subheadline}</text><rect x="72" y="490" width="360" height="92" rx="24" fill="${secondary}"/><text x="104" y="550" font-family="Arial Black,Arial" font-size="34" fill="#101014">${copy.ctaText.toUpperCase()}</text><text x="72" y="636" font-family="Arial Black,Arial" font-size="34" fill="white">CODE ${copy.couponCode}</text></svg>`;
  return {
    imageUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    promptUsed: prompt,
    headline: copy.headline,
    subheadline: copy.subheadline,
    ctaText: copy.ctaText,
    couponCode: copy.couponCode,
    fallback: true,
    htmlCreative: svg,
    error
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const adSize = normalizeSize(body.adSize);
  const creative = buildPrompt(body, adSize);

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(fallbackSvg(body, adSize, "OPENAI_API_KEY is not configured. Showing an HTML/CSS fallback advertisement."));
  }

  try {
    const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5";
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        prompt: creative.promptUsed,
        size: sizeMap[adSize].apiSize,
        quality: process.env.OPENAI_IMAGE_QUALITY || "medium",
        output_format: "png"
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(fallbackSvg(body, adSize, data?.error?.message || "OpenAI image generation failed."));
    }

    const image = data?.data?.[0];
    const imageUrl = image?.b64_json ? `data:image/png;base64,${image.b64_json}` : image?.url;
    if (!imageUrl) {
      return NextResponse.json(fallbackSvg(body, adSize, "OpenAI did not return an image URL."));
    }

    return NextResponse.json({
      imageUrl,
      promptUsed: image?.revised_prompt || creative.promptUsed,
      headline: creative.headline,
      subheadline: creative.subheadline,
      ctaText: creative.ctaText,
      couponCode: creative.couponCode
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate image ad.";
    return NextResponse.json(fallbackSvg(body, adSize, message));
  }
}
