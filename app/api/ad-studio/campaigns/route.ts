import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import type { AdScope, AdStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

function str(body: Record<string, unknown>, key: string, fallback = "") {
  return String(body[key] ?? fallback).trim();
}
function nullable(body: Record<string, unknown>, key: string) {
  const value = str(body, key);
  return value ? value : null;
}
function int(body: Record<string, unknown>, key: string, fallback = 0) {
  const value = Number.parseInt(str(body, key, String(fallback)), 10);
  return Number.isFinite(value) ? value : fallback;
}
function historySelect(item: any) {
  return {
    campaignId: item.campaignId,
    parentCampaignId: item.parentCampaignId,
    versionNumber: item.versionNumber,
    businessName: item.business,
    headline: item.headline || "",
    subheadline: item.subheadline || "",
    ctaText: item.ctaText || "Claim Offer",
    couponCode: item.couponCode || "",
    adSize: "Mobile Sponsor Card",
    imageUrl: item.image || "",
    promptUsed: item.prompt || "",
    createdAt: item.createdAt.toISOString(),
    slotPublished: item.slotPublished,
    selectedSlot: item.selectedSlot,
    targetUrl: item.targetUrl,
    logoBase64: item.logoBase64,
    publishStatus: item.publishStatus
  };
}

export async function GET() {
  await requireAdmin();
  const campaigns = await prisma.stalltalkCampaignHistory.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return NextResponse.json(campaigns.map(historySelect));
}

export async function POST(request: Request) {
  await requireAdmin();
  const body = await request.json() as Record<string, unknown>;
  const action = str(body, "action", "save");
  if (action === "publish") return publishCampaign(body);
  if (action === "duplicate") return duplicateCampaign(body);
  return saveCampaign(body);
}

export async function PATCH(request: Request) {
  await requireAdmin();
  const body = await request.json() as Record<string, unknown>;
  const action = str(body, "action");
  const campaignId = str(body, "campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  if (action === "unpublish") return unpublishCampaign(campaignId);
  if (action === "archive") return updateStatus(campaignId, "ARCHIVED");
  return saveCampaign(body);
}

async function saveCampaign(body: Record<string, unknown>) {
  const campaignId = str(body, "campaignId") || crypto.randomUUID();
  const parentCampaignId = str(body, "parentCampaignId", campaignId);
  const item = await prisma.stalltalkCampaignHistory.upsert({
    where: { campaignId },
    update: historyData(body, parentCampaignId),
    create: { campaignId, ...historyData(body, parentCampaignId) }
  });
  revalidatePath("/admin/ad-studio");
  return NextResponse.json({ ok: true, campaign: historySelect(item) });
}

async function duplicateCampaign(body: Record<string, unknown>) {
  const source = await prisma.stalltalkCampaignHistory.findUnique({ where: { campaignId: str(body, "campaignId") } });
  if (!source) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  const copyId = crypto.randomUUID();
  const copy = await prisma.stalltalkCampaignHistory.create({ data: { publisherId: source.publisherId, advertiserId: source.advertiserId, campaignId: copyId, parentCampaignId: source.parentCampaignId || source.campaignId, versionNumber: source.versionNumber + 1, business: `${source.business} Copy`, image: source.image, prompt: source.prompt, headline: source.headline, subheadline: source.subheadline, ctaText: source.ctaText, couponCode: source.couponCode, adSize: source.adSize, logoBase64: source.logoBase64, logoUrl: source.logoUrl, targetUrl: source.targetUrl, selectedSlot: source.selectedSlot, publishStatus: "GENERATED" } });
  revalidatePath("/admin/ad-studio");
  return NextResponse.json({ ok: true, campaign: historySelect(copy) });
}

async function publishCampaign(body: Record<string, unknown>) {
  const issueId = str(body, "issueId");
  const slotNumber = int(body, "slotNumber");
  if (!issueId || slotNumber < 1 || slotNumber > 8) return NextResponse.json({ error: "issueId and slotNumber 1-8 are required" }, { status: 400 });
  const issue = await prisma.issue.findUnique({ where: { id: issueId }, include: { venue: true } });
  if (!issue) return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  const scope = str(body, "scope", "GLOBAL") as AdScope;
  const ad = await prisma.ad.create({ data: { publisherId: str(body, "publisherId"), advertiserId: str(body, "advertiserId"), businessName: str(body, "businessName"), title: str(body, "title"), offer: str(body, "offer"), artworkUrl: nullable(body, "artworkUrl"), creativeType: "IMAGE", promptUsed: nullable(body, "promptUsed"), generatedHeadline: nullable(body, "generatedHeadline"), generatedSubheadline: nullable(body, "generatedSubheadline"), adSize: "320x100", ctaText: str(body, "ctaText", "Claim Offer"), targetUrl: str(body, "targetUrl", "#"), phone: nullable(body, "phone"), couponCode: nullable(body, "couponCode"), status: "ACTIVE" as AdStatus, scope, venueId: scope === "VENUE" ? nullable(body, "venueId") : null, restroomId: scope === "RESTROOM" ? nullable(body, "restroomId") : null } });
  await prisma.issueAdSlot.upsert({ where: { issueId_slotNumber: { issueId, slotNumber } }, update: { adId: ad.id, source: scope }, create: { issueId, adId: ad.id, slotNumber, source: scope } });
  await prisma.stalltalkAdSlot.upsert({ where: { slotNumber }, update: { adId: ad.id, business: ad.businessName, image: ad.artworkUrl, headline: ad.generatedHeadline || ad.title, subheadline: ad.generatedSubheadline || ad.offer, ctaText: ad.ctaText, couponCode: ad.couponCode, targetUrl: ad.targetUrl, phone: ad.phone, publisherId: ad.publisherId }, create: { slotNumber, adId: ad.id, business: ad.businessName, image: ad.artworkUrl, headline: ad.generatedHeadline || ad.title, subheadline: ad.generatedSubheadline || ad.offer, ctaText: ad.ctaText, couponCode: ad.couponCode, targetUrl: ad.targetUrl, phone: ad.phone, publisherId: ad.publisherId } });
  const campaignId = str(body, "campaignId", ad.id);
  const parentCampaignId = str(body, "parentCampaignId", campaignId);
  await prisma.stalltalkCampaignHistory.updateMany({ where: { parentCampaignId, NOT: { campaignId } }, data: { publishStatus: "SUPERSEDED" } });
  const history = await prisma.stalltalkCampaignHistory.upsert({ where: { campaignId }, update: { ...historyData(body, parentCampaignId), adId: ad.id, publishStatus: "PUBLISHED", slotPublished: slotNumber, selectedSlot: slotNumber, publishedAt: new Date() }, create: { campaignId, ...historyData(body, parentCampaignId), adId: ad.id, publishStatus: "PUBLISHED", slotPublished: slotNumber, selectedSlot: slotNumber, publishedAt: new Date() } });
  revalidatePath("/issue");
  if (issue.venue?.slug) revalidatePath(`/issue/${issue.venue.slug}`);
  revalidatePath("/admin/ad-studio");
  return NextResponse.json({ ok: true, adId: ad.id, message: `Published campaign ${ad.businessName} to ${issue.title} Slot ${slotNumber}`, campaign: historySelect(history) });
}

async function unpublishCampaign(campaignId: string) {
  const campaign = await prisma.stalltalkCampaignHistory.findUnique({ where: { campaignId } });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (campaign.adId) await prisma.ad.update({ where: { id: campaign.adId }, data: { status: "PAUSED" } });
  await prisma.issueAdSlot.deleteMany({ where: { adId: campaign.adId || "" } });
  const item = await prisma.stalltalkCampaignHistory.update({ where: { campaignId }, data: { publishStatus: "UNPUBLISHED", slotPublished: null } });
  revalidatePath("/issue");
  revalidatePath("/admin/ad-studio");
  return NextResponse.json({ ok: true, campaign: historySelect(item) });
}
async function updateStatus(campaignId: string, publishStatus: string) {
  const item = await prisma.stalltalkCampaignHistory.update({ where: { campaignId }, data: { publishStatus } });
  revalidatePath("/admin/ad-studio");
  return NextResponse.json({ ok: true, campaign: historySelect(item) });
}
function historyData(body: Record<string, unknown>, parentCampaignId: string) {
  return { parentCampaignId, publisherId: nullable(body, "publisherId"), advertiserId: nullable(body, "advertiserId"), versionNumber: int(body, "versionNumber", 1), business: str(body, "businessName", "Untitled Campaign"), image: nullable(body, "artworkUrl") || nullable(body, "imageUrl"), prompt: str(body, "promptUsed", "Saved campaign"), headline: nullable(body, "generatedHeadline") || nullable(body, "headline") || nullable(body, "title"), subheadline: nullable(body, "generatedSubheadline") || nullable(body, "subheadline") || nullable(body, "offer"), ctaText: nullable(body, "ctaText"), couponCode: nullable(body, "couponCode"), adSize: "Mobile Sponsor Card", logoBase64: nullable(body, "logoBase64"), targetUrl: nullable(body, "targetUrl"), selectedSlot: int(body, "slotNumber", int(body, "selectedSlot", 1)), publishStatus: str(body, "publishStatus", "GENERATED") };
}
