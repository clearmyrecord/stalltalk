import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type AdSize = "Banner" | "Square" | "Tall" | "Footer";
type Diagnostic = {
  apiStatus: "ok" | "failed";
  openAiStatus: "connected" | "failed" | "not_configured";
  model: string;
  errorType?: string;
  error?: string;
  openAiStatusCode?: number;
  requestId?: string | null;
  rateLimited?: boolean;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VALID_IMAGE_MODELS = new Set(["gpt-image-1.5", "gpt-image-1", "gpt-image-1-mini", "dall-e-3", "dall-e-2"]);

const sizeMap: Record<AdSize, { apiSize: string; composition: string; cssSafeArea: string }> = {
  Banner: { apiSize: "1536x1024", composition: "wide banner advertisement with large central headline and horizontal CTA safe area", cssSafeArea: "16:5 banner crop" },
  Square: { apiSize: "1024x1024", composition: "square social-style advertisement with balanced headline, product atmosphere, and CTA", cssSafeArea: "1:1 square" },
  Tall: { apiSize: "1024x1536", composition: "tall mobile advertisement with vertical hierarchy, clear offer, and bottom CTA", cssSafeArea: "4:5 tall crop" },
  Footer: { apiSize: "1536x1024", composition: "slim footer-strip advertisement composed inside a centered horizontal band with no important text near edges", cssSafeArea: "5:1 footer crop" }
};

function safe(value: unknown, fallback: string) {
  return String(value || "").trim() || fallback;
}

function limitText(value: string, max: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= max ? normalized : `${normalized.slice(0, Math.max(0, max - 1)).trim()}…`;
}

function normalizeSize(value: unknown): AdSize {
  const normalized = safe(value, "Banner").toLowerCase();
  if (normalized.includes("square")) return "Square";
  if (normalized.includes("tall")) return "Tall";
  if (normalized.includes("footer")) return "Footer";
  return "Banner";
}

function currentModel() {
  return safe(process.env.OPENAI_IMAGE_MODEL, "gpt-image-1.5");
}

function diagnostic(overrides: Partial<Diagnostic> = {}): Diagnostic {
  return {
    apiStatus: "failed",
    openAiStatus: process.env.OPENAI_API_KEY ? "failed" : "not_configured",
    model: currentModel(),
    ...overrides
  };
}

function couponFor(businessName: string, couponCode: string) {
  return couponCode || `${businessName.replace(/[^a-z0-9]/gi, "").slice(0, 5).toUpperCase() || "STALL"}15`;
}

function buildCopy(body: Record<string, unknown>) {
  const businessName = limitText(safe(body.businessName, "Your Business"), 32);
  const offer = limitText(safe(body.offer, "Limited-time offer"), 44);
  const audience = limitText(safe(body.audience, "nearby customers"), 42);
  const ctaText = limitText(safe(body.ctaText || body.cta, "Claim Offer"), 18);
  const couponCode = limitText(couponFor(businessName, safe(body.couponCode, "")), 16);
  const headline = limitText(offer, 34);
  const subheadline = limitText(`For ${audience}`, 46);
  return { businessName, offer, audience, ctaText, couponCode, headline, subheadline };
}

function buildPrompt(body: Record<string, unknown>, adSize: AdSize) {
  const copy = buildCopy(body);
  const category = safe(body.category || body.businessCategory, "local business");
  const tone = safe(body.tone || body.style, "Professional");
  const visualStyle = safe(body.visualStyle, "Vegas Neon");
  const website = safe(body.website, "");
  const phone = safe(body.phone, "");
  const brandColors = safe(body.brandColors, "brand-appropriate high contrast colors");
  const size = sizeMap[adSize];

  return {
    ...copy,
    promptUsed: [
      `Create a finished, production-ready marketing graphic advertisement for the business name "${copy.businessName}".`,
      `Keep the business name visually separate from the offer headline. Do not merge the business name into the headline.`,
      `Business category: ${category}. Offer headline: "${copy.headline}". Audience: ${copy.audience}.`,
      `Tone: ${tone}. Visual style: ${visualStyle}. Brand colors: ${brandColors}.`,
      `Canvas: ${adSize}; generate at ${size.apiSize}; composition: ${size.composition}; must stay readable when cropped into a ${size.cssSafeArea} ad slot.`,
      `Use large readable typography only: business name "${copy.businessName}", headline "${copy.headline}", subheadline "${copy.subheadline}", CTA "${copy.ctaText}", coupon code "${copy.couponCode}".`,
      website ? `Include website ${website} only if it remains readable.` : "",
      phone ? `Include phone ${phone} only if it remains readable.` : "",
      "Avoid tiny text, overflow, clipped words, fake UI chrome, screenshots, web page mockups, HTML cards, lorem ipsum, and design-process annotations. Return the final ad artwork only."
    ].filter(Boolean).join(" ")
  };
}

function imageRequestBody(model: string, prompt: string, adSize: AdSize) {
  const outputFormat = safe(process.env.OPENAI_IMAGE_OUTPUT_FORMAT, "png");
  if (model.startsWith("gpt-image")) {
    return {
      model,
      prompt,
      n: 1,
      size: sizeMap[adSize].apiSize,
      quality: safe(process.env.OPENAI_IMAGE_QUALITY, "medium"),
      output_format: outputFormat
    };
  }

  return {
    model,
    prompt,
    n: 1,
    size: model === "dall-e-2" ? "1024x1024" : sizeMap[adSize].apiSize,
    quality: safe(process.env.OPENAI_IMAGE_QUALITY, "standard"),
    response_format: "b64_json"
  };
}

async function parseJsonResponse(response: Response) {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to parse OpenAI response JSON.";
    console.error("[generate-ad-image] OpenAI JSON parse error", { message, status: response.status, raw: raw.slice(0, 500) });
    throw new Error(`OpenAI returned invalid JSON: ${message}`);
  }
}

async function saveGeneratedCreative(body: Record<string, unknown>, adSize: AdSize, creative: ReturnType<typeof buildPrompt>, imageUrl: string) {
  const publisherId = safe(body.publisherId, "");
  const advertiserId = safe(body.advertiserId, "");
  const campaignBaseId = safe(body.campaignId, crypto.randomUUID());
  const campaignId = `${campaignBaseId}-${adSize.toLowerCase()}`;
  try {
    await prisma.stalltalkCampaignHistory.create({
      data: {
        campaignId,
        publisherId: publisherId || null,
        advertiserId: advertiserId || null,
        business: creative.businessName,
        image: imageUrl,
        prompt: creative.promptUsed,
        headline: creative.headline,
        subheadline: creative.subheadline,
        ctaText: creative.ctaText,
        couponCode: creative.couponCode,
        adSize
      }
    });
    return { campaignId, historySaved: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save campaign history.";
    console.error("[generate-ad-image] Campaign history save failed", { message, campaignId, adSize });
    return { campaignId, historySaved: false, historyError: message };
  }
}

export async function GET() {
  const model = currentModel();
  const apiKeyDetected = Boolean(process.env.OPENAI_API_KEY);
  return NextResponse.json({
    apiStatus: "ok",
    openAiStatus: apiKeyDetected ? "configured" : "not_configured",
    apiKeyDetected,
    model,
    modelValid: VALID_IMAGE_MODELS.has(model),
    vercel: Boolean(process.env.VERCEL),
    nodeEnv: process.env.NODE_ENV || "unknown"
  });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request body was not valid JSON.";
    console.error("[generate-ad-image] Request JSON parse error", { message });
    return NextResponse.json({ error: message, diagnostic: diagnostic({ errorType: "json_parse_error" }) }, { status: 400 });
  }

  const adSize = normalizeSize(body.adSize || body.adSizeKey);
  const creative = buildPrompt(body, adSize);
  const model = currentModel();

  if (!process.env.OPENAI_API_KEY) {
    const message = "OPENAI_API_KEY is not configured on the server/Vercel environment.";
    console.error("[generate-ad-image] Missing OPENAI_API_KEY");
    return NextResponse.json({ ...creative, error: message, diagnostic: diagnostic({ errorType: "missing_api_key", openAiStatus: "not_configured" }) }, { status: 500 });
  }

  if (!VALID_IMAGE_MODELS.has(model)) {
    const message = `Invalid OpenAI image model "${model}". Use one of: ${Array.from(VALID_IMAGE_MODELS).join(", ")}.`;
    console.error("[generate-ad-image] Invalid model", { model });
    return NextResponse.json({ ...creative, error: message, diagnostic: diagnostic({ errorType: "invalid_model", openAiStatus: "failed" }) }, { status: 500 });
  }

  const requestBody = imageRequestBody(model, creative.promptUsed, adSize);

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    const data = await parseJsonResponse(response);
    const requestId = response.headers.get("x-request-id");

    if (!response.ok) {
      const message = data?.error?.message || `OpenAI image generation failed with HTTP ${response.status}.`;
      const errorType = response.status === 429 ? "rate_limit" : data?.error?.type || data?.error?.code || "openai_api_error";
      console.error("[generate-ad-image] OpenAI API error", { status: response.status, requestId, errorType, message, model });
      return NextResponse.json({
        ...creative,
        error: message,
        diagnostic: diagnostic({ errorType, error: message, openAiStatusCode: response.status, requestId, rateLimited: response.status === 429 })
      }, { status: response.status });
    }

    const image = data?.data?.[0];
    const imageUrl = image?.b64_json ? `data:image/${safe(process.env.OPENAI_IMAGE_OUTPUT_FORMAT, "png")};base64,${image.b64_json}` : image?.url;
    if (!imageUrl) {
      const message = "OpenAI returned a successful response without image data.";
      console.error("[generate-ad-image] Missing image data", { requestId, model, responseKeys: Object.keys(data || {}) });
      return NextResponse.json({ ...creative, error: message, diagnostic: diagnostic({ errorType: "missing_image_data", error: message, requestId }) }, { status: 502 });
    }

    const history = await saveGeneratedCreative(body, adSize, creative, imageUrl);

    return NextResponse.json({
      imageUrl,
      promptUsed: image?.revised_prompt || creative.promptUsed,
      headline: creative.headline,
      subheadline: creative.subheadline,
      ctaText: creative.ctaText,
      couponCode: creative.couponCode,
      businessName: creative.businessName,
      adSize,
      model,
      diagnostic: diagnostic({ apiStatus: "ok", openAiStatus: "connected", requestId }),
      ...history
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fetch to OpenAI image generation failed.";
    console.error("[generate-ad-image] Vercel/fetch function error", { message, model });
    return NextResponse.json({ ...creative, error: message, diagnostic: diagnostic({ errorType: "fetch_or_function_error", error: message }) }, { status: 502 });
  }
}
