import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Status = "Connected" | "Failed";

const VALID_IMAGE_MODELS = new Set(["gpt-image-1.5", "gpt-image-1", "gpt-image-1-mini", "dall-e-3", "dall-e-2"]);

function model() {
  return String(process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5").trim();
}

async function databaseStatus() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "Connected" as Status };
  } catch (error) {
    return { status: "Failed" as Status, error: error instanceof Error ? error.message : "Database check failed." };
  }
}

async function openAiStatus(runImageTest: boolean) {
  const currentModel = model();
  if (!process.env.OPENAI_API_KEY) {
    return { status: "Failed" as Status, apiKeyDetected: false, model: currentModel, modelValid: VALID_IMAGE_MODELS.has(currentModel), error: "OPENAI_API_KEY is not configured." };
  }
  if (!VALID_IMAGE_MODELS.has(currentModel)) {
    return { status: "Failed" as Status, apiKeyDetected: true, model: currentModel, modelValid: false, error: `Invalid image model: ${currentModel}` };
  }
  if (!runImageTest) {
    return { status: "Connected" as Status, apiKeyDetected: true, model: currentModel, modelValid: true, imageGenerationTest: "not_run" };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: currentModel, prompt: "Generate a simple production test image: the words Stall Talk OpenAI OK on a clean yellow background.", n: 1, size: "1024x1024", quality: currentModel.startsWith("gpt-image") ? "low" : "standard", ...(currentModel.startsWith("gpt-image") ? { output_format: "png" } : { response_format: "b64_json" }) })
    });
    const data = await response.json().catch((error) => ({ parseError: error instanceof Error ? error.message : "Invalid JSON from OpenAI." }));
    if (!response.ok) {
      return { status: "Failed" as Status, apiKeyDetected: true, model: currentModel, modelValid: true, imageGenerationTest: "failed", statusCode: response.status, requestId: response.headers.get("x-request-id"), error: data?.error?.message || data?.parseError || "OpenAI image generation test failed." };
    }
    return { status: "Connected" as Status, apiKeyDetected: true, model: currentModel, modelValid: true, imageGenerationTest: data?.data?.[0] ? "successful" : "missing_image", requestId: response.headers.get("x-request-id") };
  } catch (error) {
    return { status: "Failed" as Status, apiKeyDetected: true, model: currentModel, modelValid: true, imageGenerationTest: "failed", error: error instanceof Error ? error.message : "OpenAI fetch failed." };
  }
}

async function publishEngineStatus() {
  try {
    await prisma.stalltalkAdSlot.count();
    await prisma.stalltalkCampaignHistory.count();
    return { status: "Connected" as Status };
  } catch (error) {
    return { status: "Failed" as Status, error: error instanceof Error ? error.message : "Publish engine tables are unavailable." };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const runImageTest = searchParams.get("runImageTest") === "1";
  const [database, openAi, publishEngine] = await Promise.all([databaseStatus(), openAiStatus(runImageTest), publishEngineStatus()]);
  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    environment: { databaseUrlDetected: Boolean(process.env.DATABASE_URL), openAiApiKeyDetected: Boolean(process.env.OPENAI_API_KEY), vercel: Boolean(process.env.VERCEL), nodeEnv: process.env.NODE_ENV || "unknown" },
    openAi,
    database,
    publishEngine,
    prisma: database.status,
    deployment: { databaseUrlStatus: process.env.DATABASE_URL ? "Detected" : "Missing", openAiApiKeyStatus: process.env.OPENAI_API_KEY ? "Detected" : "Missing", openAiImageGenerationStatus: openAi.status }
  });
}
