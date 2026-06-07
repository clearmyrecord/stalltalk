import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type AdSize = "Potty Favor Slot" | "Banner" | "Square" | "Tall" | "Rail" | "Mobile card" | "Footer";
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

const sizeMap: Record<AdSize, { apiSize: string; composition: string; cssSafeArea: string; slotDimensions: string }> = {
  "Potty Favor Slot": { apiSize: "1024x1024", composition: "Potty Favor 4:3 restroom ad-slot creative with all text composed in a centered 1024x768 safe area and magazine-ad margins", cssSafeArea: "4:3 Potty Favor slot crop", slotDimensions: "1024x768 safe art inside a 1024x1024 generation canvas" },
  Banner: { apiSize: "1536x1024", composition: "wide banner advertisement with large central headline and horizontal CTA safe area", cssSafeArea: "16:5 banner crop", slotDimensions: "1536x480 safe strip inside a 1536x1024 generation canvas" },
  Square: { apiSize: "1024x1024", composition: "square magazine advertisement with balanced headline, offer, logo, coupon, contact, and CTA", cssSafeArea: "1:1 square", slotDimensions: "1024x1024" },
  Tall: { apiSize: "1024x1536", composition: "tall magazine advertisement with vertical hierarchy, clear offer, logo area, coupon strip, contact line, and bottom CTA", cssSafeArea: "4:5 tall crop", slotDimensions: "1024x1280 safe crop inside a 1024x1536 generation canvas" },
  Rail: { apiSize: "1024x1536", composition: "vertical desktop sponsor rail with readable type from a side placement", cssSafeArea: "rail crop", slotDimensions: "1024x1536" },
  "Mobile card": { apiSize: "1024x1024", composition: "mobile-friendly sponsor card with simple hierarchy and bold CTA", cssSafeArea: "mobile card", slotDimensions: "1024x1024" },
  Footer: { apiSize: "1536x1024", composition: "slim footer-strip advertisement composed inside a centered horizontal band with no important text near edges", cssSafeArea: "5:1 footer crop", slotDimensions: "1536x307 safe strip inside a 1536x1024 generation canvas" }
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
  if (normalized.includes("potty") || normalized.includes("slot")) return "Potty Favor Slot";
  if (normalized.includes("square")) return "Square";
  if (normalized.includes("tall")) return "Tall";
  if (normalized.includes("rail")) return "Rail";
  if (normalized.includes("mobile") || normalized.includes("card")) return "Mobile card";
  if (normalized.includes("footer")) return "Footer";
  return "Banner";
}

function currentModel(body: Record<string, unknown> = {}) {
  return safe(body.openAiImageModel || body.model || process.env.OPENAI_IMAGE_MODEL, "gpt-image-2");
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
  const headlineHint = limitText(safe(body.headlineHint, "Make the offer impossible to miss"), 70);
  const subheadline = limitText(`${offer} for ${audience}`, 58);
  const contactInfo = limitText(safe(body.contactInfo, [body.phone, body.website].map((item) => safe(item, "")).filter(Boolean).join(" • ") || "Contact info in brief"), 54);
  const logoInstruction = limitText(safe(body.logoInstruction, `Reserve a clean logo area for ${businessName}`), 70);
  const conceptNumber = Number(body.conceptNumber || 1);
  const conceptCount = Number(body.conceptCount || 1);
  const conceptLabel = limitText(conceptCount > 1 ? `Concept ${conceptNumber}` : safe(body.requestMode, "Agency Concept"), 24);
  const headline = limitText(offer, 34);
  return { businessName, offer, audience, ctaText, couponCode, headline, subheadline, headlineHint, contactInfo, logoInstruction, conceptLabel };
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
  const requiredText = safe(body.requiredText, "headline, offer, call to action, brand logo area, coupon code, and contact information");
  const disclaimer = safe(body.optionalDisclaimer || body.disclaimer, "none");
  const scanGoal = safe(body.scanGoal || body.templateScanGoal, "reader should understand the offer, brand, and next action in 5 to 15 seconds");
  const requestMode = safe(body.requestMode, "agency concept");
  const variationOf = safe(body.variationOf, "");
  const size = sizeMap[adSize];

  return {
    ...copy,
    promptUsed: safe(body.prompt, [
      `Act as a senior advertising agency art director, not a generic AI artist. Create a finished, publication-ready magazine advertisement for "${copy.businessName}".`,
      `Ad structure is mandatory and must be visually obvious: 1) headline "${copy.headline}", 2) offer/subheadline "${copy.subheadline}", 3) call-to-action "${copy.ctaText}", 4) clean brand logo area, 5) coupon code "${copy.couponCode || "omit coupon if none supplied"}", 6) contact information "${copy.contactInfo}".`,
      `Logo direction: ${copy.logoInstruction}. Headline strategy: ${copy.headlineHint}. Scan objective: ${scanGoal}. Optimize for readers who spend only 5-15 seconds looking at the ad.`,
      `Business category/template: ${category}. Audience: ${copy.audience}. Concept label: ${copy.conceptLabel}. Request mode: ${requestMode}${variationOf ? `, make this a noticeably different variation of ${variationOf}` : ""}.`,
      `Tone: ${tone}. Visual style: ${visualStyle}. Brand colors: ${brandColors}. Venue/city atmosphere: ${venueVibe}.`,
      `Canvas: ${adSize}; OpenAI generation size ${size.apiSize}; Potty Favor ad-slot dimensions/safe area: ${size.slotDimensions}; composition: ${size.composition}; keep all important typography inside the ${size.cssSafeArea}.`,
      `Make it look like a real paid print/magazine advertisement with commercial photography or polished illustration, offer badge, coupon block, CTA button/pill, brand lockup area, and clean contact line.`,
      `Required text: ${requiredText}. Optional disclaimer: ${disclaimer}.`,
      website ? `Include website ${website} only if it remains readable.` : "",
      phone ? `Include phone ${phone} only if it remains readable.` : "",
      "Avoid generic AI artwork, decorative posters with no offer, mockup frames, placeholder text, lorem ipsum, watermarks, UI screenshots, fake app screens, unfinished layouts, fake UI chrome, web page mockups, clipped words, design-process annotations, and unreadable microcopy. Return the final ad artwork only."
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
  const campaignId = `${campaignBaseId}-${adSize.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${safe(body.conceptNumber, "1")}`;
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
    const imageUrl = image?.b64_json ? `data:image/${safe(process.env.OPENAI_IMAGE_OUTPUT_FORMAT, "png")};base64,${image.b64_json}` : image?.url;
    if (!imageUrl) {
      const message = "OpenAI returned a successful response without image data.";
      console.error("[generate-ad-image] Missing image data", { requestId, model, responseKeys: Object.keys(data || {}) });
      return json({ ...creative, error: message, diagnostic: diagnostic({ errorType: "missing_image_data", error: message, requestId, model }) }, request, 502);
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
      conceptLabel: creative.conceptLabel,
      contactInfo: creative.contactInfo,
      logoInstruction: creative.logoInstruction,
      adSize,
      model,
      diagnostic: diagnostic({ apiStatus: "ok", openAiStatus: "connected", requestId, model }),
      ...history
    }, request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fetch to OpenAI image generation failed.";
    console.error("[generate-ad-image] Vercel/fetch function error", { message, model });
    return json({ ...creative, error: message, diagnostic: diagnostic({ errorType: "fetch_or_function_error", error: message, model }) }, request, 502);
  }
}
