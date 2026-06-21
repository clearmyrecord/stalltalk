import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import type { AdScope, AdStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import type { User } from "@prisma/client";
import {
  DEFAULT_PUBLIC_ISSUE_ID,
  DEFAULT_PUBLIC_ISSUE_LABEL,
  isDefaultPublicIssue,
} from "@/lib/default-public-issue";
import { sponsorPlacementLabel } from "@/lib/sponsor-placements";

function readableDatabaseError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[ad-studio/campaigns] database error", error);
  for (const column of [
    "targetType",
    "targetLabel",
    "publishedToHomepage",
    "slotPublished",
    "selectedSlot",
    "publishStatus",
  ]) {
    if (message.includes(column))
      return `Database schema is missing ${column}. Run the latest migration.`;
  }
  return "Database update failed. Check server logs and run the latest migration if schema columns are missing.";
}

export const dynamic = "force-dynamic";

function str(body: Record<string, unknown>, key: string, fallback = "") {
  return String(body[key] ?? fallback).trim();
}
function nullable(body: Record<string, unknown>, key: string) {
  const value = str(body, key);
  return value ? value : null;
}
function canonicalImageUrl(body: Record<string, unknown>) {
  return (
    nullable(body, "imageUrl") ||
    nullable(body, "finalImageUrl") ||
    nullable(body, "cloudinaryUrl") ||
    nullable(body, "artworkUrl") ||
    nullable(body, "creativeUrl") ||
    nullable(body, "image") ||
    nullable(body, "image_url") ||
    nullable(body, "previewUrl")
  );
}
function int(body: Record<string, unknown>, key: string, fallback = 0) {
  const value = Number.parseInt(str(body, key, String(fallback)), 10);
  return Number.isFinite(value) ? value : fallback;
}
function historySelect(item: any) {
  const issueSlot = item.ad?.issueSlots?.[0];
  const isDefaultTarget =
    item.targetType === DEFAULT_PUBLIC_ISSUE_ID ||
    (item.publishStatus === "PUBLISHED" && !issueSlot && item.slotPublished);
  return {
    campaignId: item.campaignId,
    parentCampaignId: item.parentCampaignId,
    versionNumber: item.versionNumber,
    businessName: item.business,
    headline: item.headline || "",
    subheadline: item.subheadline || "",
    ctaText: item.ctaText || "Claim Offer",
    couponCode: item.couponCode || "",
    adSize: "4:3 Sponsor Card",
    imageUrl: item.image || "",
    promptUsed: item.prompt || "",
    createdAt: item.createdAt.toISOString(),
    slotPublished: item.slotPublished,
    selectedSlot: item.selectedSlot,
    publishedToHomepage: item.publishedToHomepage || false,
    targetUrl: item.targetUrl,
    logoBase64: item.logoBase64,
    publishStatus: item.publishStatus,
    publishedAt: item.publishedAt ? item.publishedAt.toISOString() : null,
    issueId:
      issueSlot?.issueId || (isDefaultTarget ? DEFAULT_PUBLIC_ISSUE_ID : null),
    issueTitle:
      item.targetLabel ||
      issueSlot?.issue?.title ||
      (isDefaultTarget ? DEFAULT_PUBLIC_ISSUE_LABEL : null),
    venueName: isDefaultTarget
      ? "Public"
      : issueSlot?.issue?.venue?.name || null,
    targetType:
      item.targetType || (isDefaultTarget ? DEFAULT_PUBLIC_ISSUE_ID : null),
    targetLabel:
      item.targetLabel || (isDefaultTarget ? DEFAULT_PUBLIC_ISSUE_LABEL : null),
    viewCount: item.viewCount || 0,
    clickCount: item.clickCount || 0,
  };
}

export async function GET() {
  const user = await requireRole(["ADMIN", "ADVERTISER"] as any);
  const campaigns = await prisma.stalltalkCampaignHistory.findMany({
    where: campaignWhereForUser(user),
    include: {
      ad: {
        include: {
          issueSlots: {
            include: { issue: { include: { venue: true } } },
            orderBy: { slotNumber: "asc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(campaigns.map(historySelect));
}

export async function POST(request: Request) {
  const user = await requireRole(["ADMIN", "ADVERTISER"] as any);
  const body = normalizeBodyForUser(
    (await request.json()) as Record<string, unknown>,
    user,
  );
  const action = str(body, "action", "save");
  if (action === "publish") {
    if (user.role === "ADVERTISER") return submitCampaignForReview(body, user);
    return publishCampaignSafe(body);
  }
  if (action === "duplicate") return duplicateCampaign(body, user);
  return saveCampaign(body, user);
}

export async function PATCH(request: Request) {
  const user = await requireRole(["ADMIN", "ADVERTISER"] as any);
  const body = normalizeBodyForUser(
    (await request.json()) as Record<string, unknown>,
    user,
  );
  const action = str(body, "action");
  const campaignId = str(body, "campaignId");
  if (!campaignId)
    return NextResponse.json(
      { error: "campaignId is required" },
      { status: 400 },
    );
  if (user.role === "ADVERTISER" && !["archive", "publish"].includes(action))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (action === "unpublish")
    return user.role === "ADMIN"
      ? unpublishCampaign(campaignId)
      : NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (action === "archive") return updateStatus(campaignId, "ARCHIVED", user);
  if (action === "publish")
    return user.role === "ADVERTISER"
      ? submitCampaignForReview(body, user)
      : publishCampaignSafe(body);
  return saveCampaign(body, user);
}

export async function DELETE(request: Request) {
  const user = await requireRole(["ADMIN", "ADVERTISER"] as any);
  const body = normalizeBodyForUser(
    (await request.json()) as Record<string, unknown>,
    user,
  );
  const campaignId = str(body, "campaignId");
  if (!campaignId)
    return NextResponse.json(
      { error: "campaignId is required" },
      { status: 400 },
    );
  return updateStatus(campaignId, "ARCHIVED", user);
}

function campaignWhereForUser(user: User) {
  return user.role === "ADVERTISER"
    ? {
        advertiserId: user.advertiserId || "__missing__",
        publishStatus: { notIn: ["DELETED"] },
      }
    : { publishStatus: { notIn: ["ARCHIVED", "DELETED"] } };
}

function normalizeBodyForUser(body: Record<string, unknown>, user: User) {
  if (user.role !== "ADVERTISER") return body;
  return {
    ...body,
    advertiserId: user.advertiserId || "",
    publishStatus: str(body, "publishStatus", "DRAFT"),
  };
}

async function assertOwnCampaign(campaignId: string, user: User) {
  if (user.role !== "ADVERTISER") return true;
  if (!user.advertiserId) return false;
  const campaign = await prisma.stalltalkCampaignHistory.findUnique({
    where: { campaignId },
    select: { advertiserId: true },
  });
  return !campaign || campaign.advertiserId === user.advertiserId;
}

async function saveCampaign(body: Record<string, unknown>, user?: User) {
  const campaignId = str(body, "campaignId") || crypto.randomUUID();
  const parentCampaignId = str(body, "parentCampaignId", campaignId);
  if (user && !(await assertOwnCampaign(campaignId, user)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let item;
  try {
    item = await prisma.stalltalkCampaignHistory.upsert({
      where: { campaignId },
      update: historyData(body, parentCampaignId),
      create: { campaignId, ...historyData(body, parentCampaignId) },
    });
  } catch (error) {
    return NextResponse.json(
      { error: readableDatabaseError(error) },
      { status: 500 },
    );
  }
  revalidatePath("/admin/ad-studio");
  return NextResponse.json({
    ok: true,
    message: "Campaign saved.",
    campaign: historySelect(item),
  });
}

async function duplicateCampaign(body: Record<string, unknown>, user?: User) {
  const source = await prisma.stalltalkCampaignHistory.findUnique({
    where: { campaignId: str(body, "campaignId") },
  });
  if (!source)
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (
    user?.role === "ADVERTISER" &&
    (!user.advertiserId || source.advertiserId !== user.advertiserId)
  )
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const copyId = crypto.randomUUID();
  const copy = await prisma.stalltalkCampaignHistory.create({
    data: {
      publisherId: source.publisherId,
      advertiserId: source.advertiserId,
      campaignId: copyId,
      parentCampaignId: source.parentCampaignId || source.campaignId,
      versionNumber: source.versionNumber + 1,
      business: `${source.business} Copy`,
      image: source.image,
      prompt: source.prompt,
      headline: source.headline,
      subheadline: source.subheadline,
      ctaText: source.ctaText,
      couponCode: source.couponCode,
      adSize: source.adSize,
      logoBase64: source.logoBase64,
      logoUrl: source.logoUrl,
      targetUrl: source.targetUrl,
      selectedSlot: source.selectedSlot,
      targetType: source.targetType,
      targetLabel: source.targetLabel,
      publishedToHomepage: false,
      publishStatus: "DRAFT",
    },
  });
  revalidatePath("/admin/ad-studio");
  return NextResponse.json({
    ok: true,
    message: "Campaign duplicated as a new draft.",
    campaign: historySelect(copy),
  });
}

async function submitCampaignForReview(
  body: Record<string, unknown>,
  user: User,
) {
  if (!user.advertiserId)
    return NextResponse.json(
      { error: "Advertiser profile required" },
      { status: 403 },
    );
  const campaignId = str(body, "campaignId") || crypto.randomUUID();
  if (!(await assertOwnCampaign(campaignId, user)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parentCampaignId = str(body, "parentCampaignId", campaignId);
  const item = await prisma.stalltalkCampaignHistory.upsert({
    where: { campaignId },
    update: {
      ...historyData(
        {
          ...body,
          advertiserId: user.advertiserId,
          publishStatus: "PENDING_REVIEW",
        },
        parentCampaignId,
      ),
      publishStatus: "PENDING_REVIEW",
      publishedToHomepage: false,
      slotPublished: null,
    },
    create: {
      campaignId,
      ...historyData(
        {
          ...body,
          advertiserId: user.advertiserId,
          publishStatus: "PENDING_REVIEW",
        },
        parentCampaignId,
      ),
      publishStatus: "PENDING_REVIEW",
      publishedToHomepage: false,
      slotPublished: null,
    },
  });
  revalidatePath("/portal/advertiser/ad-studio");
  revalidatePath("/admin/ad-studio");
  return NextResponse.json({
    ok: true,
    message: "Campaign submitted for admin review.",
    campaign: historySelect(item),
  });
}

async function publishCampaignSafe(body: Record<string, unknown>) {
  try {
    return await publishCampaign(body);
  } catch (error) {
    return NextResponse.json(
      { error: readableDatabaseError(error) },
      { status: 500 },
    );
  }
}

async function publishCampaign(body: Record<string, unknown>) {
  const issueId = str(body, "issueId");
  const slotNumber = int(body, "slotNumber");
  if (!issueId || slotNumber < 1 || slotNumber > 8)
    return NextResponse.json(
      { error: "issueId and sponsor placement 1-8 are required" },
      { status: 400 },
    );
  const defaultPublicTarget = isDefaultPublicIssue(issueId);
  const issue = defaultPublicTarget
    ? null
    : await prisma.issue.findUnique({
        where: { id: issueId },
        include: { venue: true },
      });
  if (!defaultPublicTarget && !issue)
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  const scope = str(body, "scope", "GLOBAL") as AdScope;
  const advertiserId = body.advertiserId
    ? str(body, "advertiserId") || null
    : null;
  const publisherId = body.publisherId
    ? str(body, "publisherId") || null
    : null;
  const advertiser = advertiserId
    ? await prisma.advertiser.findUnique({ where: { id: advertiserId } })
    : null;
  const publisher = publisherId
    ? await prisma.publisher.findUnique({ where: { id: publisherId } })
    : null;
  const targetType = defaultPublicTarget ? DEFAULT_PUBLIC_ISSUE_ID : "issue";
  const targetLabel = defaultPublicTarget
    ? DEFAULT_PUBLIC_ISSUE_LABEL
    : issue?.title || str(body, "targetLabel", issueId);
  const imageUrl = canonicalImageUrl(body);
  if (!imageUrl || imageUrl.startsWith("data:"))
    return NextResponse.json(
      { error: "Image must be uploaded before publishing." },
      { status: 400 },
    );
  const resolvedBody = {
    ...body,
    imageUrl,
    artworkUrl: imageUrl,
    advertiserId: advertiser?.id ?? null,
    publisherId: publisher?.id ?? null,
    targetType,
    targetLabel,
  };
  const ad = await prisma.ad.create({
    data: {
      publisherId: publisher?.id ?? null,
      advertiserId: advertiser?.id ?? null,
      businessName: str(body, "businessName"),
      title: str(body, "title"),
      offer: str(body, "offer"),
      artworkUrl: imageUrl,
      creativeType: "IMAGE",
      promptUsed: nullable(body, "promptUsed"),
      generatedHeadline: nullable(body, "generatedHeadline"),
      generatedSubheadline: nullable(body, "generatedSubheadline"),
      adSize: "4:3 sponsor card",
      ctaText: str(body, "ctaText", "Claim Offer"),
      targetUrl: str(body, "targetUrl", "#"),
      phone: nullable(body, "phone"),
      couponCode: nullable(body, "couponCode"),
      status: "ACTIVE" as AdStatus,
      scope,
      venueId: scope === "VENUE" ? nullable(body, "venueId") : null,
      restroomId: scope === "RESTROOM" ? nullable(body, "restroomId") : null,
    },
  });
  if (defaultPublicTarget) {
    const previousSlot = await prisma.stalltalkAdSlot.findUnique({
      where: { slotNumber },
      include: { ad: true },
    });
    if (previousSlot?.adId) {
      await prisma.ad.update({
        where: { id: previousSlot.adId },
        data: { status: "PAUSED" },
      });
      await prisma.stalltalkCampaignHistory.updateMany({
        where: { adId: previousSlot.adId },
        data: { publishStatus: "SUPERSEDED" },
      });
    }
  } else {
    const previousSlot = await prisma.issueAdSlot.findUnique({
      where: { issueId_slotNumber: { issueId, slotNumber } },
      include: { ad: true },
    });
    if (previousSlot?.adId) {
      await prisma.ad.update({
        where: { id: previousSlot.adId },
        data: { status: "PAUSED" },
      });
      await prisma.stalltalkCampaignHistory.updateMany({
        where: { adId: previousSlot.adId },
        data: { publishStatus: "SUPERSEDED" },
      });
    }
    await prisma.issueAdSlot.upsert({
      where: { issueId_slotNumber: { issueId, slotNumber } },
      update: { adId: ad.id, source: scope },
      create: { issueId, adId: ad.id, slotNumber, source: scope },
    });
  }
  if (defaultPublicTarget)
    await prisma.stalltalkAdSlot.upsert({
      where: { slotNumber },
      update: {
        adId: ad.id,
        business: ad.businessName,
        image: imageUrl,
        headline: ad.generatedHeadline || ad.title,
        subheadline: ad.generatedSubheadline || ad.offer,
        ctaText: ad.ctaText,
        couponCode: ad.couponCode,
        targetUrl: ad.targetUrl,
        phone: ad.phone,
        publisherId: ad.publisherId,
      },
      create: {
        slotNumber,
        adId: ad.id,
        business: ad.businessName,
        image: imageUrl,
        headline: ad.generatedHeadline || ad.title,
        subheadline: ad.generatedSubheadline || ad.offer,
        ctaText: ad.ctaText,
        couponCode: ad.couponCode,
        targetUrl: ad.targetUrl,
        phone: ad.phone,
        publisherId: ad.publisherId,
      },
    });
  const campaignId = str(body, "campaignId", ad.id);
  const parentCampaignId = str(body, "parentCampaignId", campaignId);
  await prisma.stalltalkCampaignHistory.updateMany({
    where: { parentCampaignId, NOT: { campaignId } },
    data: { publishStatus: "SUPERSEDED" },
  });
  const history = await prisma.stalltalkCampaignHistory.upsert({
    where: { campaignId },
    update: {
      ...historyData(resolvedBody, parentCampaignId),
      adId: ad.id,
      publishStatus: "PUBLISHED",
      targetType,
      targetLabel,
      slotPublished: slotNumber,
      selectedSlot: slotNumber,
      publishedAt: new Date(),
      publishedToHomepage: defaultPublicTarget,
    },
    create: {
      campaignId,
      ...historyData(resolvedBody, parentCampaignId),
      adId: ad.id,
      publishStatus: "PUBLISHED",
      targetType,
      targetLabel,
      slotPublished: slotNumber,
      selectedSlot: slotNumber,
      publishedAt: new Date(),
      publishedToHomepage: defaultPublicTarget,
    },
  });
  revalidatePath("/");
  revalidatePath("/issue");
  revalidateTag("published-ads");
  if (issue?.venue?.slug) revalidatePath(`/issue/${issue.venue.slug}`);
  revalidatePath("/admin/ad-studio");
  return NextResponse.json({
    ok: true,
    adId: ad.id,
    message: `Campaign published successfully to ${sponsorPlacementLabel(slotNumber)}.`,
    campaign: historySelect(history),
  });
}

async function unpublishCampaign(campaignId: string) {
  const campaign = await prisma.stalltalkCampaignHistory.findUnique({
    where: { campaignId },
  });
  if (!campaign)
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (campaign.adId)
    await prisma.ad.update({
      where: { id: campaign.adId },
      data: { status: "PAUSED" },
    });
  await prisma.issueAdSlot.deleteMany({ where: { adId: campaign.adId || "" } });
  if (campaign.publishedToHomepage && campaign.slotPublished)
    await prisma.stalltalkAdSlot.updateMany({
      where: {
        slotNumber: campaign.slotPublished,
        adId: campaign.adId || undefined,
      },
      data: { adId: null },
    });
  const item = await prisma.stalltalkCampaignHistory.update({
    where: { campaignId },
    data: {
      publishStatus: "UNPUBLISHED",
      slotPublished: null,
      publishedToHomepage: false,
    },
  });
  revalidatePath("/");
  revalidatePath("/issue");
  revalidateTag("published-ads");
  revalidatePath("/admin/ad-studio");
  return NextResponse.json({
    ok: true,
    message: "Campaign unpublished.",
    campaign: historySelect(item),
  });
}
async function updateStatus(
  campaignId: string,
  publishStatus: string,
  user?: User,
) {
  if (user && !(await assertOwnCampaign(campaignId, user)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const item = await prisma.stalltalkCampaignHistory.update({
    where: { campaignId },
    data: { publishStatus },
  });
  if (publishStatus === "ARCHIVED") {
    revalidatePath("/");
    revalidatePath("/issue");
    revalidateTag("published-ads");
  }
  revalidatePath("/admin/ad-studio");
  return NextResponse.json({
    ok: true,
    message: `Campaign ${publishStatus.toLowerCase()}.`,
    campaign: historySelect(item),
  });
}
function historyData(body: Record<string, unknown>, parentCampaignId: string) {
  const imageUrl = canonicalImageUrl(body);
  return {
    parentCampaignId,
    targetType: nullable(body, "targetType"),
    targetLabel: nullable(body, "targetLabel"),
    publishedToHomepage: Boolean(body.publishedToHomepage),
    publisherId: nullable(body, "publisherId"),
    advertiserId: nullable(body, "advertiserId"),
    versionNumber: int(body, "versionNumber", 1),
    business: str(
      body,
      "businessName",
      str(body, "business_name", "Untitled Campaign"),
    ),
    image: imageUrl,
    prompt: str(body, "promptUsed", str(body, "prompt", "Saved campaign")),
    headline:
      nullable(body, "generatedHeadline") ||
      nullable(body, "headline") ||
      nullable(body, "title"),
    subheadline:
      nullable(body, "generatedSubheadline") ||
      nullable(body, "subheadline") ||
      nullable(body, "offer"),
    ctaText: nullable(body, "ctaText") || nullable(body, "cta"),
    couponCode: nullable(body, "couponCode"),
    adSize: "4:3 Sponsor Card",
    logoBase64: nullable(body, "logoBase64"),
    logoUrl: nullable(body, "logoUrl"),
    targetUrl: nullable(body, "targetUrl") || nullable(body, "click_url"),
    selectedSlot: int(
      body,
      "slotNumber",
      int(body, "selectedSlot", int(body, "placement", 1)),
    ),
    publishStatus: str(body, "publishStatus", "DRAFT"),
  };
}
