import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type AdSize = "Banner" | "Square" | "Tall" | "Rail" | "Mobile card" | "Footer";
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

const VALID_IMAGE_MODELS = new Set(["gpt-image-2", "gpt-image-1", "dall-e-3"]);
const ALLOWED_ORIGINS = ["https://clearmyrecord.github.io", "http://localhost:3000", "http://localhost:8080"];

const sizeMap: Record<AdSize, { apiSize: string; composition: string; cssSafeArea: string }> = {
  Banner: { apiSize: "1536x1024", composition: "wide banner advertisement with large central headline and horizontal CTA safe area", cssSafeArea: "16:5 banner crop" },
  Square: { apiSize: "1024x1024", composition: "square social-style advertisement with balanced headline, product atmosphere, and CTA", cssSafeArea: "1:1 square" },
  Tall: { apiSize: "1024x1536", composition: "tall mobile advertisement with vertical hierarchy, clear offer, and bottom CTA", cssSafeArea: "4:5 tall crop" },
  Rail: { apiSize: "1024x1536", composition: "vertical desktop sponsor rail with readable type from a side placement", cssSafeArea: "rail crop" },
  "Mobile card": { apiSize: "1024x1024", composition: "mobile-friendly sponsor card with simple hierarchy and bold CTA", cssSafeArea: "mobile card" },
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
  if (normalized.includes("rail")) return "Rail";
  if (normalized.includes("mobile") || normalized.includes("card")) return "Mobile card";
  if (normalized.includes("footer")) return "Footer";
  return "Banner";
}

function currentModel() {
  return safe(process.env.OPENAI_IMAGE_MODEL, "gpt-image-2");
}

function diagnostic(overrides: Partial<Diagnostic> = {}): Diagnostic {
  return {
    apiStatus: "failed",
    openAiStatus: process.env.OPENAI_API_KEY ? "failed" : "not_configured",
    model: currentModel(),
    ...overrides
  };
}

function corsHeaders(request?: Request) {
  const origin = request?.headers.get("origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin"
  };
}

function json(payload: unknown, request?: Request, status = 200) {
  return NextResponse.json(payload, { status, headers: corsHeaders(request) });
}

function validateBrief(body: Record<string, unknown>) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "JSON body must be an object.";
  if (!safe(body.businessName, "")) return "Business name is required.";
  if (!safe(body.offer, "")) return "Offer / promotion is required.";
  return "";
}

function mapOpenAiError(status: number, data: any) {
  const message = safe(data?.error?.message, "").toLowerCase();
  const code = safe(data?.error?.code || data?.error?.type, "");
  if (status === 429 && (message.includes("billing") || message.includes("quota") || code.includes("insufficient_quota") || code.includes("hard_limit"))) return "billing_hard_limit";
  if (status === 429) return "rate_limit";
  if (message.includes("model") && (message.includes("does not exist") || message.includes("invalid"))) return "invalid_model";
  return code || "openai_api_error";
}

function buildCopy(body: Record<string, unknown>) {
  const businessName = limitText(safe(body.businessName, "Your Business"), 32);
  const offer = limitText(safe(body.offer, "Limited-time offer"), 44);
  const audience = limitText(safe(body.audience || body.targetAudience, "nearby customers"), 42);
  const ctaText = limitText(safe(body.ctaText || body.cta, "Claim Offer"), 18);
  const couponCode = limitText(safe(body.couponCode, ""), 16);
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
  const venueVibe = [body.venueTargeting, body.cityTargeting || body.city, body.stateTargeting || body.state].map((item) => safe(item, "")).filter(Boolean).join(", ") || "local venue/city vibe";
  const requiredText = safe(body.requiredText, "none beyond business name, offer, CTA, and coupon if provided");
  const disclaimer = safe(body.optionalDisclaimer || body.disclaimer, "none");
  const size = sizeMap[adSize];

  return {
    ...copy,
    promptUsed: [
      `Create a finished, production-ready marketing graphic advertisement for the business name "${copy.businessName}".`,
      `Keep the business name visually separate from the offer headline. Do not merge the business name into the headline.`,
      `Business category: ${category}. Offer headline: "${copy.headline}". Audience: ${copy.audience}.`,
      `Tone: ${tone}. Visual style: ${visualStyle}. Brand colors: ${brandColors}. Venue/city vibe: ${venueVibe}.`,
      `Canvas: ${adSize}; generate at ${size.apiSize}; composition: ${size.composition}; must stay readable when cropped into a ${size.cssSafeArea} ad slot.`,
      `Use large readable typography only: business name "${copy.businessName}", headline "${copy.headline}", subheadline "${copy.subheadline}", CTA "${copy.ctaText}", coupon code "${copy.couponCode || "omit coupon"}".`,
      `Required text: ${requiredText}. Optional disclaimer: ${disclaimer}.`,
      website ? `Include website ${website} only if it remains readable.` : "",
      phone ? `Include phone ${phone} only if it remains readable.` : "",
      "No placeholder text. Avoid tiny text, overflow, clipped words, fake UI chrome, screenshots, web page mockups, HTML cards, lorem ipsum, and design-process annotations. Return commercial advertisement quality final ad artwork only."
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

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function GET(request: Request) {
  const model = currentModel();
  const apiKeyDetected = Boolean(process.env.OPENAI_API_KEY);
  return json({
    apiStatus: "ok",
    openAiStatus: apiKeyDetected ? "configured" : "not_configured",
    apiKeyDetected,
    model,
    modelValid: VALID_IMAGE_MODELS.has(model),
    vercel: Boolean(process.env.VERCEL),
    nodeEnv: process.env.NODE_ENV || "unknown"
  }, request);
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request body was not valid JSON.";
    console.error("[generate-ad-image] Request JSON parse error", { message });
    return json({ error: message, diagnostic: diagnostic({ errorType: "json_parse_error" }) }, request, 400);
  }

  const model = currentModel();
  const validationError = validateBrief(body);
  if (validationError) return json({ error: validationError, diagnostic: diagnostic({ errorType: "invalid_input" }) }, request, 400);
  const adSize = normalizeSize(body.adSize || body.adSizeKey);
  const creative = buildPrompt(body, adSize);

  if (!process.env.OPENAI_API_KEY) {
    const message = "OPENAI_API_KEY is not configured on the server/Vercel environment.";
    console.error("[generate-ad-image] Missing OPENAI_API_KEY");
    return json({ ...creative, error: message, diagnostic: diagnostic({ errorType: "missing_api_key", openAiStatus: "not_configured" }) }, request, 500);
  }

  if (!VALID_IMAGE_MODELS.has(model)) {
    const message = `Invalid OpenAI image model "${model}". Use one of: ${Array.from(VALID_IMAGE_MODELS).join(", ")}.`;
    console.error("[generate-ad-image] Invalid model", { model });
    return json({ ...creative, error: message, diagnostic: diagnostic({ errorType: "invalid_model", openAiStatus: "failed" }) }, request, 500);
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
      const rawMessage = data?.error?.message || `OpenAI image generation failed with HTTP ${response.status}.`;
      const errorType = mapOpenAiError(response.status, data);
      const message = errorType === "billing_hard_limit" ? "OpenAI billing limit reached. Update billing in OpenAI Platform." : rawMessage;
      console.error("[generate-ad-image] OpenAI API error", { status: response.status, requestId, errorType, message, model });
      return json({
        ...creative,
        error: message,
        diagnostic: diagnostic({ errorType, error: message, openAiStatusCode: response.status, requestId, rateLimited: errorType === "rate_limit" })
      }, request, response.status);
    }

    const image = data?.data?.[0];
    const imageUrl = image?.b64_json ? `data:image/${safe(process.env.OPENAI_IMAGE_OUTPUT_FORMAT, "png")};base64,${image.b64_json}` : image?.url;
    if (!imageUrl) {
      const message = "OpenAI returned a successful response without image data.";
      console.error("[generate-ad-image] Missing image data", { requestId, model, responseKeys: Object.keys(data || {}) });
      return json({ ...creative, error: message, diagnostic: diagnostic({ errorType: "missing_image_data", error: message, requestId }) }, request, 502);
    }

    const history = await saveGeneratedCreative(body, adSize, creative, imageUrl);

    return json({
      imageUrl,
      promptUsed: image?.revised_prompt || creative.promptUsed,
      headline: creative.headline,
      subheadline: creative.subheadline,
      ctaText: creative.ctaText,
      cta: creative.ctaText,
      couponCode: creative.couponCode,
      businessName: creative.businessName,
      adSize,
      model,
      diagnostic: diagnostic({ apiStatus: "ok", openAiStatus: "connected", requestId }),
      ...history
    }, request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fetch to OpenAI image generation failed.";
    console.error("[generate-ad-image] Vercel/fetch function error", { message, model });
    return json({ ...creative, error: message, diagnostic: diagnostic({ errorType: "fetch_or_function_error", error: message }) }, request, 502);
  }
}
