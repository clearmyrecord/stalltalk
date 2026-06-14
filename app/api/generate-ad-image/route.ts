import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type AdSize = "Mobile Sponsor Card";
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

const VALID_IMAGE_MODELS = new Set(["gpt-image-2", "gpt-image-1"]);
const ALLOWED_ORIGINS = ["https://stalltalk.vercel.app", "https://clearmyrecord.github.io", "http://localhost:3000", "http://localhost:8080"];

const SPONSOR_CARD_SIZE = {
  apiSize: "1024x1024",
  composition: "mobile-first square Potty Favor sponsor card with one clear visual hierarchy, premium branded composition, and protected readable text areas",
  cssSafeArea: "1:1 Mobile Sponsor Card"
};

const sizeMap: Record<AdSize, typeof SPONSOR_CARD_SIZE> = {
  "Mobile Sponsor Card": SPONSOR_CARD_SIZE
};

function safe(value: unknown, fallback: string) {
  return String(value || "").trim() || fallback;
}

function limitText(value: string, max: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= max ? normalized : `${normalized.slice(0, Math.max(0, max - 1)).trim()}…`;
}

function normalizeSize(_value: unknown): AdSize {
  return "Mobile Sponsor Card";
}

function currentModel(body: Record<string, unknown> = {}) {
  return safe(body.openAiImageModel || body.model || process.env.OPENAI_IMAGE_MODEL, "gpt-image-1");
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
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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
  const creativeBrief = safe(body.creativeBrief || body.brief, "Create a high-converting local sponsor advertisement.");
  const requiredText = safe(body.requiredText, "none beyond business name, offer, CTA, and coupon if provided");
  const disclaimer = safe(body.optionalDisclaimer || body.disclaimer, "none");
  const logoInstruction = safe(body.logoBase64, "")
    ? "A private uploaded logo is included in the request; use it as visual inspiration, preserve the brand feel, and do not expose a logo URL."
    : safe(body.logoUrl, "")
      ? `Use the provided logo URL as visual brand inspiration only if accessible: ${safe(body.logoUrl, "")}.`
      : "No logo was provided; do not invent a fake logo.";
  const size = sizeMap[adSize];

  return {
    ...copy,
    promptUsed: safe(body.prompt, [
      `Create a finished, high-quality commercial advertisement for the business name "${copy.businessName}" with premium visual composition, commercial lighting, strong hierarchy, clean spacing, and polished final artwork.`,
      `Creative brief: ${creativeBrief}.`,
      `Keep the business name visually separate from the offer headline. Include the business name "${copy.businessName}", the offer headline "${copy.headline}", CTA "${copy.ctaText}", and coupon code "${copy.couponCode || "omit coupon"}" if provided.`,
      `Business category: ${category}. Audience: ${copy.audience}. Subheadline: "${copy.subheadline}".`,
      `Tone: ${tone}. Match the selected visual style: ${visualStyle}. Brand colors: ${brandColors}. Match the venue/city atmosphere: ${venueVibe}.`,
      `Canvas: ${adSize}; generate exactly one square image at ${size.apiSize}; composition: ${size.composition}; the finished image must match the displayed ${size.cssSafeArea} exactly with full-bleed artwork and generous mobile safe margins.`,
      `Professional local business ad: premium background, clear logo zone in the upper safe area, short readable typography, strong offer, visible CTA button, coupon chip, brand-consistent accents, and no more than 6 words per text block when possible.`,
      `Required text: ${requiredText}. Optional disclaimer: ${disclaimer}.`,
      logoInstruction,
      website ? `Include website ${website} only if it remains readable.` : "",
      phone ? `Include phone ${phone} only if it remains readable.` : "",
      "Avoid mockup frames, placeholder text, lorem ipsum, watermarks, UI screenshots, fake app screens, unfinished layouts, fake UI chrome, web page mockups, clipped words, design-process annotations, and unreadable microcopy. Return publish-ready commercial advertisement artwork only."
    ].filter(Boolean).join(" "))
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
  const campaignId = campaignBaseId;
  try {
    await prisma.stalltalkCampaignHistory.upsert({
      where: { campaignId },
      update: {
        publisherId: publisherId || null,
        advertiserId: advertiserId || null,
        business: creative.businessName,
        image: imageUrl,
        prompt: creative.promptUsed,
        headline: creative.headline,
        subheadline: creative.subheadline,
        ctaText: creative.ctaText,
        couponCode: creative.couponCode,
        adSize,
        logoBase64: safe(body.logoBase64, "") || null,
        logoUrl: safe(body.logoUrl, "") || null,
        targetUrl: safe(body.website || body.targetUrl, "") || null,
        selectedSlot: Number(body.slot || body.slotNumber || 1),
        publishStatus: "GENERATED"
      },
      create: {
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
        adSize,
        logoBase64: safe(body.logoBase64, "") || null,
        logoUrl: safe(body.logoUrl, "") || null,
        targetUrl: safe(body.website || body.targetUrl, "") || null,
        selectedSlot: Number(body.slot || body.slotNumber || 1),
        publishStatus: "GENERATED"
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

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request body was not valid JSON.";
    console.error("[generate-ad-image] Request JSON parse error", { message });
    return json({ error: message, diagnostic: diagnostic({ errorType: "json_parse_error" }) }, request, 400);
  }

  const model = currentModel(body);
  const validationError = validateBrief(body);
  if (validationError) return json({ error: validationError, diagnostic: diagnostic({ errorType: "invalid_input", model }) }, request, 400);
  const adSize = normalizeSize(body.adSize || body.adSizeKey);
  const creative = buildPrompt(body, adSize);

  if (!process.env.OPENAI_API_KEY) {
    const message = "OPENAI_API_KEY is not configured on the server/Vercel environment.";
    console.error("[generate-ad-image] Missing OPENAI_API_KEY");
    return json({ ...creative, error: message, diagnostic: diagnostic({ errorType: "missing_api_key", openAiStatus: "not_configured", model }) }, request, 500);
  }

  if (!VALID_IMAGE_MODELS.has(model)) {
    const message = `Invalid OpenAI image model "${model}". Use one of: ${Array.from(VALID_IMAGE_MODELS).join(", ")}.`;
    console.error("[generate-ad-image] Invalid model", { model });
    return json({ ...creative, error: message, diagnostic: diagnostic({ errorType: "invalid_model", openAiStatus: "failed", model }) }, request, 500);
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
        diagnostic: diagnostic({ errorType, error: message, openAiStatusCode: response.status, requestId, rateLimited: errorType === "rate_limit", model })
      }, request, response.status);
    }

    const image = data?.data?.[0];
    const imageBase64 = safe(image?.b64_json || image?.image_base64 || image?.imageBase64, "");
    const imageUrl = imageBase64 ? `data:image/${safe(process.env.OPENAI_IMAGE_OUTPUT_FORMAT, "png")};base64,${imageBase64}` : image?.url;
    if (!imageUrl) {
      const message = "OpenAI returned a successful response without image data.";
      console.error("[generate-ad-image] Missing image data", { requestId, model, responseKeys: Object.keys(data || {}) });
      return json({ ...creative, error: message, diagnostic: diagnostic({ errorType: "missing_image_data", error: message, requestId, model }) }, request, 502);
    }

    const history = await saveGeneratedCreative(body, adSize, creative, imageUrl);

    return json({
      ok: true,
      imageBase64,
      imageUrl,
      prompt: image?.revised_prompt || creative.promptUsed,
      promptUsed: image?.revised_prompt || creative.promptUsed,
      headline: creative.headline,
      subheadline: creative.subheadline,
      ctaText: creative.ctaText,
      cta: creative.ctaText,
      couponCode: creative.couponCode,
      businessName: creative.businessName,
      adSize,
      model,
      metadata: {
        businessName: creative.businessName,
        businessCategory: safe(body.businessCategory || body.category, "local business"),
        offer: creative.offer,
        ctaText: creative.ctaText,
        city: safe(body.cityTargeting || body.city, ""),
        state: safe(body.stateTargeting || body.state, ""),
        slot: Number(body.slot || 1),
        model,
        requestId,
        logoProvided: Boolean(safe(body.logoBase64, "") || safe(body.logoUrl, ""))
      },
      diagnostic: diagnostic({ apiStatus: "ok", openAiStatus: "connected", requestId, model }),
      ...history
    }, request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fetch to OpenAI image generation failed.";
    console.error("[generate-ad-image] Vercel/fetch function error", { message, model });
    return json({ ...creative, error: message, diagnostic: diagnostic({ errorType: "fetch_or_function_error", error: message, model }) }, request, 502);
  }
}
