"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AdScope, AdStatus, AnalyticsEventType, ContentBlockType, IssueStatus, MediaAssetType, VenueContentType } from "@prisma/client";
import { prisma } from "./prisma";
import { requireAdmin, requireRole } from "./auth";
import { slugify } from "./format";
import { calculateFlightTotal, flightDateRange, flightEndMonth, normalizeFlightMonth, PRICE_PER_PLACEMENT_MONTH_CENTS, safeFlightMonths } from "./campaign-flights";
import { qrIssueUrl } from "./qr";
import { sponsorPlacementLabel } from "./sponsor-placements";

function text(formData: FormData, key: string, fallback = "") {
  return String(formData.get(key) ?? fallback).trim();
}

function nullableText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value.length ? value : null;
}

function intValue(formData: FormData, key: string, fallback = 0) {
  const value = Number.parseInt(text(formData, key, String(fallback)), 10);
  return Number.isFinite(value) ? value : fallback;
}

export async function createPublisher(formData: FormData) {
  await requireAdmin();
  const name = text(formData, "name");
  await prisma.publisher.create({ data: { name, slug: text(formData, "slug", slugify(name)) || slugify(name), contactEmail: text(formData, "contactEmail") } });
  revalidatePath("/admin/publishers");
}

export async function createDistributor(formData: FormData) {
  await requireAdmin();
  const name = text(formData, "name");
  await prisma.distributor.create({ data: { publisherId: text(formData, "publisherId"), name, slug: text(formData, "slug", slugify(name)) || slugify(name), contactEmail: text(formData, "contactEmail"), commissionRate: intValue(formData, "commissionRate", 15) / 100 } });
  revalidatePath("/admin/distributors");
}

export async function createVenue(formData: FormData) {
  await requireAdmin();
  const name = text(formData, "name");
  await prisma.venue.create({ data: { publisherId: text(formData, "publisherId"), distributorId: nullableText(formData, "distributorId"), name, slug: text(formData, "slug", slugify(name)) || slugify(name), city: text(formData, "city"), state: text(formData, "state"), address: text(formData, "address"), venueType: text(formData, "venueType", "venue"), isActive: text(formData, "isActive", "on") !== "off" } });
  revalidatePath("/admin/venues");
}

export async function createRestroom(formData: FormData) {
  await requireAdmin();
  await prisma.restroom.create({ data: { venueId: text(formData, "venueId"), name: text(formData, "name"), floor: nullableText(formData, "floor"), placement: nullableText(formData, "placement") } });
  revalidatePath("/admin/venues");
  revalidatePath("/admin/qr");
}

export async function createQrCode(formData: FormData) {
  await requireAdmin();
  const qrSlug = slugify(text(formData, "qrSlug", `qr-${Date.now()}`));
  const venueId = nullableText(formData, "venueId");
  const restroomId = nullableText(formData, "restroomId");
  const venue = venueId ? await prisma.venue.findUnique({ where: { id: venueId } }) : null;
  const qrUrl = qrIssueUrl(qrSlug);
  const qrCode = await prisma.qrCode.create({ data: { publisherId: text(formData, "publisherId"), venueId, restroomId, assignedDistributorId: nullableText(formData, "assignedDistributorId"), qrSlug, qrName: text(formData, "qrName", qrSlug), qrUrl, shortUrl: qrUrl, qrType: text(formData, "qrType", restroomId ? "RESTROOM" : venueId ? "VENUE" : "TEST") as any, stickerTemplate: text(formData, "stickerTemplate", "STALL_DOOR") as any, callToAction: text(formData, "callToAction", "Scan for Potty Favor"), campaignSource: nullableText(formData, "campaignSource"), advertisementSource: nullableText(formData, "advertisementSource"), promotionSource: nullableText(formData, "promotionSource"), couponSource: nullableText(formData, "couponSource"), status: venueId ? "ACTIVE" : "DRAFT" } });
  await prisma.qrLifecycleEvent.create({ data: { qrCodeId: qrCode.id, action: "CREATE", note: "QR created from admin registry" } });
  revalidatePath("/admin/qr");
}

export async function createAdvertiser(formData: FormData) {
  await requireAdmin();
  const name = text(formData, "name");
  await prisma.advertiser.create({ data: { publisherId: text(formData, "publisherId"), name, slug: text(formData, "slug", slugify(name)) || slugify(name), contactEmail: text(formData, "contactEmail"), portalNote: nullableText(formData, "portalNote") } });
  revalidatePath("/admin/advertisers");
  revalidatePath("/portal/advertiser");
  revalidatePath("/");
}

export async function createAd(formData: FormData) {
  await requireAdmin();
  const issueId = nullableText(formData, "issueId");
  const slotNumber = intValue(formData, "slotNumber");
  if (!issueId) throw new Error("Select an issue before publishing this generated ad.");
  if (slotNumber < 1 || slotNumber > 8) throw new Error("Select a valid sponsor placement before publishing this generated ad.");
  const ad = await prisma.ad.create({ data: adData(formData) });
  const publication = await publishAdToSlot(ad.id, formData);
  revalidatePath("/admin/ads");
  revalidatePath("/admin/issue-builder");
  return { ok: true, adId: ad.id, message: `Published campaign ${text(formData, "businessName", ad.businessName)} to Issue ${publication.issueTitle} ${sponsorPlacementLabel(publication.slotNumber)}` };
}

export async function updateAd(id: string, formData: FormData) {
  await requireAdmin();
  await prisma.ad.update({ where: { id }, data: adData(formData) });
  await publishAdToSlot(id, formData);
  revalidatePath("/admin/ads");
  revalidatePath("/admin/issue-builder");
  revalidatePath("/portal/advertiser");
}

function adData(formData: FormData) {
  const scope = text(formData, "scope", "GLOBAL") as AdScope;
  return {
    publisherId: text(formData, "publisherId"),
    advertiserId: text(formData, "advertiserId"),
    businessName: text(formData, "businessName"),
    title: text(formData, "title"),
    offer: text(formData, "offer"),
    artworkUrl: nullableText(formData, "artworkUrl"),
    creativeType: text(formData, "creativeType", "IMAGE"),
    htmlCreative: nullableText(formData, "htmlCreative"),
    videoUrl: nullableText(formData, "videoUrl"),
    promptUsed: nullableText(formData, "promptUsed"),
    generatedHeadline: nullableText(formData, "generatedHeadline"),
    generatedSubheadline: nullableText(formData, "generatedSubheadline"),
    adSize: nullableText(formData, "adSize"),
    ctaText: text(formData, "ctaText", "Claim Offer"),
    targetUrl: text(formData, "targetUrl", "#"),
    phone: nullableText(formData, "phone"),
    couponCode: nullableText(formData, "couponCode"),
    status: text(formData, "status", "ACTIVE") as AdStatus,
    scope,
    city: scope === "CITY" ? nullableText(formData, "city") : null,
    state: scope === "CITY" ? nullableText(formData, "state") : null,
    venueId: scope === "VENUE" ? nullableText(formData, "venueId") : null,
    venueIds: scope === "VENUE" ? selectedVenueIds(formData) : [],
    restroomId: scope === "RESTROOM" ? nullableText(formData, "restroomId") : null,
    monthlyPriceCents: intValue(formData, "monthlyPriceDollars") * 100,
    stripePriceId: nullableText(formData, "stripePriceId")
  };
}

async function publishAdToSlot(adId: string, formData: FormData) {
  const issueId = nullableText(formData, "issueId");
  const slotNumber = intValue(formData, "slotNumber");
  if (!issueId) throw new Error("Issue ID is required before publishing an ad to a sponsor placement.");
  if (slotNumber < 1 || slotNumber > 8) throw new Error("Sponsor placement is required and must be between 1 and 8.");

  const issue = await prisma.issue.findUnique({ where: { id: issueId }, select: { id: true, title: true, venue: { select: { slug: true } } } });
  if (!issue) throw new Error("Selected issue was not found.");

  const scope = text(formData, "scope", "GLOBAL") as AdScope;
  await prisma.issueAdSlot.upsert({
    where: { issueId_slotNumber: { issueId, slotNumber } },
    update: { adId, source: scope },
    create: { issueId, adId, slotNumber, source: scope }
  });

  await prisma.stalltalkAdSlot.upsert({
    where: { slotNumber },
    update: adSlotData(adId, formData),
    create: { slotNumber, ...adSlotData(adId, formData) }
  });

  const campaignId = text(formData, "campaignId", adId);
  await prisma.stalltalkCampaignHistory.updateMany({
    where: { parentCampaignId: text(formData, "parentCampaignId", campaignId), NOT: { campaignId } },
    data: { publishStatus: "SUPERSEDED" }
  });
  await prisma.stalltalkCampaignHistory.upsert({
    where: { campaignId },
    update: campaignHistoryData(adId, slotNumber, formData),
    create: { campaignId, parentCampaignId: text(formData, "parentCampaignId", campaignId), versionNumber: intValue(formData, "versionNumber", 1), ...campaignHistoryData(adId, slotNumber, formData) }
  });

  revalidateIssuePaths(issueId);
  revalidatePath("/issue");
  if (issue.venue?.slug) revalidatePath(`/issue/${issue.venue.slug}`);
  revalidatePath("/admin/ads/new");
  revalidatePath(`/admin/issues/${issueId}/edit`);
  return { issueTitle: issue.title, slotNumber };
}

function adSlotData(adId: string, formData: FormData) {
  return {
    adId,
    publisherId: nullableText(formData, "publisherId"),
    business: text(formData, "businessName"),
    creativeType: text(formData, "creativeType", "IMAGE"),
    image: nullableText(formData, "artworkUrl"),
    htmlCreative: nullableText(formData, "htmlCreative"),
    videoUrl: nullableText(formData, "videoUrl"),
    prompt: nullableText(formData, "promptUsed"),
    headline: nullableText(formData, "generatedHeadline") || text(formData, "title"),
    subheadline: nullableText(formData, "generatedSubheadline") || text(formData, "offer"),
    ctaText: text(formData, "ctaText", "Claim Offer"),
    couponCode: nullableText(formData, "couponCode"),
    targetUrl: text(formData, "targetUrl", "#"),
    phone: nullableText(formData, "phone")
  };
}

function campaignHistoryData(adId: string, slotPublished: number, formData: FormData) {
  return {
    publisherId: nullableText(formData, "publisherId"),
    advertiserId: nullableText(formData, "advertiserId"),
    adId,
    business: text(formData, "businessName"),
    image: nullableText(formData, "artworkUrl"),
    prompt: text(formData, "promptUsed", "OpenAI image creative"),
    headline: nullableText(formData, "generatedHeadline") || text(formData, "title"),
    subheadline: nullableText(formData, "generatedSubheadline") || text(formData, "offer"),
    ctaText: text(formData, "ctaText", "Claim Offer"),
    couponCode: nullableText(formData, "couponCode"),
    adSize: text(formData, "adSize", "4:3 Sponsor Card"),
    logoBase64: nullableText(formData, "logoBase64"),
    logoUrl: nullableText(formData, "logoUrl"),
    targetUrl: text(formData, "targetUrl", "#"),
    selectedSlot: slotPublished,
    publishStatus: "PUBLISHED",
    publishedAt: new Date(),
    slotPublished
  };
}

export async function createArticle(formData: FormData) {
  await requireAdmin();
  const title = text(formData, "title");
  await prisma.article.create({ data: { publisherId: text(formData, "publisherId"), categoryId: nullableText(formData, "categoryId"), title, slug: text(formData, "slug", slugify(title)) || slugify(title), excerpt: text(formData, "excerpt"), body: text(formData, "body"), imageUrl: nullableText(formData, "imageUrl"), status: text(formData, "status", "DRAFT") as IssueStatus, scheduledAt: nullableText(formData, "scheduledAt") ? new Date(text(formData, "scheduledAt")) : null, publishedAt: text(formData, "status") === "PUBLISHED" ? new Date() : null } });
  revalidatePath("/admin/articles");
}

export type IssueSaveState = { ok: boolean; message: string; issueId?: string; editUrl?: string };

export async function createIssue(formData: FormData) {
  const result = await saveNewIssue(formData);
  if (!result.ok || !result.issueId) throw new Error(result.message);
  redirect(`/admin/issues/${result.issueId}/edit?saved=${result.issueId}`);
}

export async function createIssueAction(_state: IssueSaveState, formData: FormData): Promise<IssueSaveState> {
  return saveNewIssue(formData);
}

export async function updateIssue(id: string, formData: FormData) {
  const result = await saveExistingIssue(id, formData);
  if (!result.ok) throw new Error(result.message);
}

export async function updateIssueAction(id: string, _state: IssueSaveState, formData: FormData): Promise<IssueSaveState> {
  return saveExistingIssue(id, formData);
}

async function saveNewIssue(formData: FormData): Promise<IssueSaveState> {
  try {
    await requireAdmin();
    logIssueSavePayload("create", formData);
    const issue = await prisma.$transaction(async (tx) => {
      const issue = await tx.issue.create({ data: await issueData(formData) });
      await saveContentBlocks(issue.id, formData, tx);
      await saveAdSlots(issue.id, formData, tx);
      return issue;
    });
    revalidateIssuePaths(issue.id);
    const response = { ok: true, message: `Issue saved successfully. Saved issue ID: ${issue.id}`, issueId: issue.id, editUrl: `/admin/issues/${issue.id}/edit` };
    console.log("[issue-save-response]", response);
    return response;
  } catch (error) {
    return issueSaveError(error);
  }
}

async function saveExistingIssue(id: string, formData: FormData): Promise<IssueSaveState> {
  try {
    await requireAdmin();
    logIssueSavePayload("update", formData, id);
    await prisma.$transaction(async (tx) => {
      const existing = await tx.issue.findUnique({ where: { id }, select: { status: true, publishedAt: true, updatedAt: true } });
      if (!existing) throw new Error("Issue not found.");
      const data = await issueData(formData, existing);
      await tx.issue.update({ where: { id }, data });
      await tx.issueContentBlock.deleteMany({ where: { issueId: id } });
      await tx.issueAdSlot.deleteMany({ where: { issueId: id } });
      await saveContentBlocks(id, formData, tx);
      await saveAdSlots(id, formData, tx);
    });
    revalidateIssuePaths(id);
    const response = { ok: true, message: `Issue saved successfully. Saved issue ID: ${id}`, issueId: id, editUrl: `/admin/issues/${id}/edit` };
    console.log("[issue-save-response]", response);
    return response;
  } catch (error) {
    return issueSaveError(error);
  }
}

function revalidateIssuePaths(id: string) {
  revalidatePath("/admin/issues");
  revalidatePath(`/admin/issues/${id}/edit`);
  revalidatePath("/issue");
}

async function issueData(formData: FormData, existing?: { status: IssueStatus; publishedAt: Date | null }) {
  const status = text(formData, "status", "DRAFT") as IssueStatus;
  const scheduledText = nullableText(formData, "scheduledAt");
  if (status !== "DRAFT" && !scheduledText) throw new Error("Schedule ISO is required before scheduling or publishing an issue. Draft issues can be saved without it.");
  const scheduledAt = scheduledText ? new Date(scheduledText) : null;
  if (scheduledText && Number.isNaN(scheduledAt?.getTime())) throw new Error("Schedule ISO must be a valid date/time when provided.");
  const publisherId = text(formData, "publisherId") || (await prisma.publisher.findFirst({ select: { id: true } }))?.id;
  if (!publisherId) throw new Error("Create a publisher before saving an issue.");
  const now = new Date();
  const firstPublishedAt = existing?.publishedAt || (status === "PUBLISHED" ? now : null);
  const republishedAt = existing?.publishedAt && existing.status !== "PUBLISHED" && status === "PUBLISHED" ? now : null;
  return { publisherId, venueId: nullableText(formData, "venueId"), restroomId: nullableText(formData, "restroomId"), qrCodeId: nullableText(formData, "qrCodeId"), title: text(formData, "title", "Untitled issue") || "Untitled issue", month: text(formData, "month", new Date().toLocaleString("en-US", { month: "long" })) || new Date().toLocaleString("en-US", { month: "long" }), year: intValue(formData, "year", new Date().getFullYear()), issueNumber: intValue(formData, "issueNumber", 1), status, scheduledAt, publishedAt: firstPublishedAt, republishedAt };
}

function logIssueSavePayload(mode: "create" | "update", formData: FormData, issueId?: string) {
  if (process.env.NODE_ENV === "production") return;
  console.log("[issue-save-payload]", { mode, issueId, values: Object.fromEntries(formData.entries()), multiValues: Array.from(formData.keys()).reduce<Record<string, string[]>>((acc, key) => ({ ...acc, [key]: formData.getAll(key).map(String) }), {}) });
}

function issueSaveError(error: unknown): IssueSaveState {
  const message = error instanceof Error ? error.message : String(error || "Issue save failed.");
  const response = { ok: false, message };
  console.error("[issue-save-response]", response, error);
  return response;
}

async function saveContentBlocks(issueId: string, formData: FormData, db: any = prisma) {
  const blocks = Array.from({ length: 8 }, (_, index) => {
    const row = index + 1;
    return { issueId, articleId: nullableText(formData, `blockArticle${row}`), type: text(formData, `blockType${row}`, "ARTICLE") as ContentBlockType, title: text(formData, `blockTitle${row}`), body: text(formData, `blockBody${row}`), imageUrl: nullableText(formData, `blockImage${row}`), venueIds: selectedVenueIds(formData, `blockVenueIds${row}`), sortOrder: row, layout: { zone: `slot-${row}`, locked: false } };
  }).filter((block) => block.title || block.body || block.articleId);
  if (blocks.length) await db.issueContentBlock.createMany({ data: blocks });
}

function selectedVenueIds(formData: FormData, key = "venueIds") {
  return formData.getAll(key).map(String).filter(Boolean);
}

async function saveAdSlots(issueId: string, formData: FormData, db: any = prisma) {
  const slots = Array.from({ length: 8 }, (_, index) => ({ slotNumber: index + 1, adId: text(formData, `slot${index + 1}`) })).filter((slot) => slot.adId).map((slot) => ({ ...slot, issueId }));
  if (slots.length) await db.issueAdSlot.createMany({ data: slots });
}


export async function recordReviewClick(formData: FormData) {
  await recordAnalytics(formData);
  redirect(text(formData, "targetUrl", "/issue"));
}

export async function recordAnalytics(formData: FormData) {
  await prisma.analyticsEvent.create({ data: { publisherId: nullableText(formData, "publisherId"), venueId: nullableText(formData, "venueId"), restroomId: nullableText(formData, "restroomId"), qrCodeId: nullableText(formData, "qrCodeId"), issueId: nullableText(formData, "issueId"), advertiserId: nullableText(formData, "advertiserId"), adId: nullableText(formData, "adId"), type: text(formData, "type") as AnalyticsEventType, slotNumber: intValue(formData, "slotNumber") || null, visitorId: nullableText(formData, "visitorId"), sessionId: nullableText(formData, "sessionId"), durationMs: intValue(formData, "durationMs") || null, path: nullableText(formData, "path"), metadata: nullableText(formData, "metadata") ? JSON.parse(text(formData, "metadata")) : undefined } });
}


function decimalValue(formData: FormData, key: string, fallback = 5) {
  const value = Number.parseFloat(text(formData, key, String(fallback)));
  return Number.isFinite(value) ? Math.max(0, Math.min(5, value)) : fallback;
}

function reviewData(formData: FormData) {
  const status = text(formData, "status", "DRAFT") as IssueStatus;
  const publishDateText = nullableText(formData, "publishDate");
  return {
    publisherId: text(formData, "publisherId"),
    title: text(formData, "title", text(formData, "restaurantName", "Restaurant Review")),
    restaurantName: text(formData, "restaurantName"),
    venueId: nullableText(formData, "venueId"),
    venueIds: selectedVenueIds(formData),
    featuredImageUrl: nullableText(formData, "featuredImageUrl") || nullableText(formData, "photoUrl"),
    photoUrl: nullableText(formData, "photoUrl") || nullableText(formData, "featuredImageUrl"),
    starRating: decimalValue(formData, "rating", decimalValue(formData, "starRating")),
    cuisineType: nullableText(formData, "cuisine") || nullableText(formData, "cuisineType"),
    address: nullableText(formData, "address"),
    city: nullableText(formData, "city"),
    state: nullableText(formData, "state"),
    websiteUrl: nullableText(formData, "ctaUrl") || nullableText(formData, "website") || nullableText(formData, "websiteUrl"),
    instagramUrl: nullableText(formData, "instagramUrl"),
    facebookUrl: nullableText(formData, "facebookUrl"),
    reviewHeadline: text(formData, "shortDescription", text(formData, "reviewHeadline")),
    reviewBody: text(formData, "review", text(formData, "reviewBody")),
    reviewerName: text(formData, "reviewerName", "Potty Favor Review Team"),
    publishDate: publishDateText ? new Date(publishDateText) : status === "PUBLISHED" ? new Date() : null,
    status
  };
}

export async function createRestaurantReview(formData: FormData) {
  await requireAdmin();
  await prisma.restaurantReview.create({ data: reviewData(formData) });
  revalidatePath("/admin/restaurant-reviews");
  revalidatePath("/issue");
}

export async function updateRestaurantReview(id: string, formData: FormData) {
  await requireAdmin();
  await prisma.restaurantReview.update({ where: { id }, data: reviewData(formData) });
  revalidatePath("/admin/restaurant-reviews");
  revalidatePath(`/admin/restaurant-reviews/${id}/edit`);
  revalidatePath("/issue");
}

export async function deleteRestaurantReview(id: string) {
  await requireAdmin();
  await prisma.restaurantReview.delete({ where: { id } });
  revalidatePath("/admin/restaurant-reviews");
  revalidatePath("/issue");
}

export async function deleteAd(id: string) { await requireAdmin(); await prisma.ad.delete({ where: { id } }); revalidatePath("/admin/ads"); }
export async function deleteVenue(id: string) { await requireAdmin(); await prisma.venue.delete({ where: { id } }); revalidatePath("/admin/venues"); }
export async function publishIssue(id: string) {
  await requireAdmin();
  const existing = await prisma.issue.findUniqueOrThrow({ where: { id }, select: { status: true, publishedAt: true } });
  const now = new Date();
  await prisma.issue.update({ where: { id }, data: { status: "PUBLISHED", publishedAt: existing.publishedAt || now, republishedAt: existing.publishedAt ? now : null } });
  revalidatePath("/admin/issues");
  revalidatePath("/issue");
}

export async function unpublishIssue(id: string) {
  await requireAdmin();
  await prisma.issue.update({ where: { id }, data: { status: "DRAFT" } });
  revalidatePath("/admin/issues");
  revalidatePath("/issue");
}

export async function archiveIssue(id: string) {
  await requireAdmin();
  await prisma.issue.update({ where: { id }, data: { status: "ARCHIVED" } });
  revalidatePath("/admin/issues");
}

export async function cloneIssue(id: string) {
  await requireAdmin();
  const source = await prisma.issue.findUniqueOrThrow({ where: { id }, include: { contentBlocks: true, adSlots: true } });
  const clone = await prisma.issue.create({ data: { publisherId: source.publisherId, venueId: source.venueId, restroomId: source.restroomId, qrCodeId: null, title: source.title, month: source.month, year: source.year, issueNumber: source.issueNumber + 1, status: "DRAFT", scheduledAt: null, contentBlocks: { create: source.contentBlocks.map((block) => ({ articleId: block.articleId, type: block.type, title: block.title, body: block.body, imageUrl: block.imageUrl, venueIds: block.venueIds, sortOrder: block.sortOrder, startsAt: block.startsAt, endsAt: block.endsAt, layout: block.layout === null ? undefined : block.layout })) }, adSlots: { create: source.adSlots.map((slot) => ({ adId: slot.adId, slotNumber: slot.slotNumber, source: slot.source })) } } });
  revalidatePath("/admin/issues");
  redirect(`/admin/issues/${clone.id}/edit`);
}

export async function deleteIssue(id: string) { await requireAdmin(); await prisma.issue.delete({ where: { id } }); revalidatePath("/admin/issues"); }

export async function signIn(formData: FormData) {
  const { authEnvStatus, createSession, verifyPassword } = await import("./auth");
  if (!authEnvStatus().isConfigured) redirect("/signin?setup=auth");
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");
  let user;
  try {
    user = await prisma.user.findUnique({ where: { email } });
  } catch (error) {
    console.error("[auth-signin]", { context: "user_lookup", table: "User", query: "findUniqueByEmail", prismaCode: (error as { code?: string })?.code, errorName: (error as { name?: string })?.name, meta: (error as { meta?: unknown })?.meta });
    redirect("/signin?error=setup");
  }
  if (!user || !verifyPassword(password, user.passwordHash) || user.status !== "ACTIVE") redirect("/signin?error=credentials");
  try {
    await createSession(user.id);
  } catch (error) {
    console.error("[auth-signin]", { context: "session_create", table: "AuthSession", query: "create", prismaCode: (error as { code?: string })?.code, errorName: (error as { name?: string })?.name, meta: (error as { meta?: unknown })?.meta });
    redirect("/signin?error=setup");
  }
  if (user.role === "ADMIN") redirect("/admin");
  if (user.role === "ADVERTISER") redirect("/portal/advertiser");
  if (user.role === "VENUE_MANAGER") redirect("/portal/venue");
  if (user.role === "DISTRIBUTOR") redirect("/portal/distributor");

  redirect("/signin?error=role");
}

export async function signOutAction() {
  const { signOut } = await import("./auth");
  await signOut();
  redirect("/signin");
}

export async function createAdSlotInventory(formData: FormData) {
  await requireAdmin();
  await prisma.adSlotInventory.create({ data: { venueId: text(formData, "venueId"), restroomId: nullableText(formData, "restroomId"), qrCodeId: nullableText(formData, "qrCodeId"), slotNumber: intValue(formData, "slotNumber", 1), month: text(formData, "month"), priceCents: intValue(formData, "priceDollars", 50) * 100, status: text(formData, "status", "OPEN") as any } });
  revalidatePath("/admin/venues");
  revalidatePath("/portal/advertiser");
}

export async function createAdvertiserCampaign(formData: FormData) {
  const user = await requireRole(["ADVERTISER", "ADMIN"] as any);
  const inventoryIds = formData.getAll("inventoryIds").map(String).filter(Boolean);
  const singleInventoryId = text(formData, "inventoryId");
  const placements = [...new Set(inventoryIds.length ? inventoryIds : singleInventoryId ? [singleInventoryId] : [])];
  if (!placements.length) throw new Error("Select at least one QR/toilet placement before saving a campaign.");

  const flightMonths = safeFlightMonths(intValue(formData, "flightMonths", intValue(formData, "months", 1)));
  const flightStartMonth = normalizeFlightMonth(text(formData, "flightStartMonth", text(formData, "startsAt")));
  const flightEnd = flightEndMonth(flightStartMonth, flightMonths);
  const placementCount = placements.length;
  const totalAmountCents = calculateFlightTotal(placementCount, flightMonths);
  const { startsAt, endsAt } = flightDateRange(flightStartMonth, flightMonths);
  const inventory = await prisma.adSlotInventory.findMany({ where: { id: { in: placements } } });
  if (inventory.length !== placements.length) throw new Error("One or more selected placements are no longer available.");
  const conflicts = await findOverlappingCampaignPlacements(inventory, flightStartMonth, flightEnd);
  if (conflicts.length) throw new Error("One or more selected placements already has a paid or active campaign during this flight.");

  const advertiserId = user.role === "ADVERTISER" && user.advertiserId ? user.advertiserId : text(formData, "advertiserId");
  await prisma.adCampaign.create({
    data: {
      advertiserId,
      inventoryId: placements[0],
      placements: { create: placements.map((inventoryId) => ({ inventoryId })) },
      name: text(formData, "name", "Draft campaign"),
      businessName: text(formData, "businessName"),
      headline: text(formData, "headline"),
      body: text(formData, "body"),
      creativeUrl: nullableText(formData, "creativeUrl"),
      targetUrl: text(formData, "targetUrl", "#"),
      ctaText: text(formData, "ctaText", "Learn More"),
      months: flightMonths,
      locationCount: placementCount,
      priceCents: totalAmountCents,
      flightStartMonth,
      flightEndMonth: flightEnd,
      flightMonths,
      pricePerPlacementMonthCents: PRICE_PER_PLACEMENT_MONTH_CENTS,
      placementCount,
      totalAmountCents,
      budgetCents: intValue(formData, "budgetDollars", Math.round(totalAmountCents / 100)) * 100,
      remainingBudgetCents: intValue(formData, "budgetDollars", Math.round(totalAmountCents / 100)) * 100,
      description: nullableText(formData, "description"),
      targetType: text(formData, "targetType", "GLOBAL_NETWORK") as any,
      targetStates: formData.getAll("targetStates").map(String).filter(Boolean),
      targetCities: formData.getAll("targetCities").map(String).filter(Boolean),
      targetVenueIds: formData.getAll("targetVenueIds").map(String).filter(Boolean),
      targetVenueTypes: formData.getAll("targetVenueTypes").map(String).filter(Boolean),
      status: "DRAFT",
      approvalStatus: "SUBMITTED",
      submittedAt: new Date(),
      startsAt,
      endsAt,
      creatives: { create: [{ advertiserId, kind: text(formData, "creativeKind", "IMAGE") as any, imageUrl: nullableText(formData, "creativeUrl"), headline: text(formData, "headline"), body: text(formData, "body"), callToAction: text(formData, "ctaText", "Learn More"), destinationUrl: text(formData, "targetUrl", "#"), approvalStatus: "SUBMITTED" as any }] }
    }
  });

  revalidatePath("/portal/advertiser");
  revalidatePath("/admin/dashboard");
}

async function findOverlappingCampaignPlacements(inventory: Array<{ id: string; venueId: string; restroomId: string | null; qrCodeId: string | null; toiletLocationId: string | null; slotNumber: number }>, flightStartMonth: string, flightEndMonth: string, excludeCampaignId?: string) {
  if (!inventory.length) return [];
  const slotIdentity = inventory.map((slot) => ({ venueId: slot.venueId, restroomId: slot.restroomId, qrCodeId: slot.qrCodeId, toiletLocationId: slot.toiletLocationId, slotNumber: slot.slotNumber }));
  return prisma.adCampaignPlacement.findMany({
    where: {
      campaignId: excludeCampaignId ? { not: excludeCampaignId } : undefined,
      inventory: { OR: slotIdentity },
      campaign: {
        status: { in: ["PAID", "ACTIVE"] },
        flightStartMonth: { lte: flightEndMonth },
        flightEndMonth: { gte: flightStartMonth }
      }
    },
    include: { campaign: true, inventory: true }
  });
}

export async function approveAdCampaign(id: string, formData?: FormData) {
  const user = await requireAdmin();
  const campaign = await prisma.adCampaign.update({ where: { id }, data: { approvalStatus: "APPROVED", approvedAt: new Date(), approvedBy: user?.id || null, adminApprovalNote: formData ? nullableText(formData, "adminApprovalNote") : null }, include: { inventory: true } });
  if (campaign.status === "PAID") await publishPaidCampaign(id);
  revalidatePath("/admin/ads");
  revalidatePath("/admin/dashboard");
  revalidatePath("/portal/advertiser");
}

export async function rejectAdCampaign(id: string, formData?: FormData) {
  const user = await requireAdmin();
  await prisma.adCampaign.update({ where: { id }, data: { approvalStatus: "REJECTED", status: "REJECTED", rejectedAt: new Date(), rejectedBy: user?.id || null, rejectionReason: formData ? nullableText(formData, "rejectionReason") : null } });
  revalidatePath("/admin/ads");
  revalidatePath("/admin/dashboard");
  revalidatePath("/portal/advertiser");
}

async function publishPaidCampaign(campaignId: string) {
  const campaign = await prisma.adCampaign.findUnique({ where: { id: campaignId }, include: { placements: { include: { inventory: true } }, inventory: true, advertiser: true } });
  if (!campaign || campaign.status !== "PAID" || campaign.approvalStatus !== "APPROVED") return;
  const placements = campaign.placements.length ? campaign.placements.map((placement) => placement.inventory) : campaign.inventory ? [campaign.inventory] : [];
  if (!placements.length) return;
  const ads = await Promise.all(placements.map((inventory) => prisma.ad.create({ data: { publisherId: campaign.advertiser.publisherId, advertiserId: campaign.advertiserId, businessName: campaign.businessName, title: campaign.headline, offer: campaign.body, artworkUrl: campaign.creativeUrl, ctaText: campaign.ctaText, targetUrl: campaign.targetUrl, status: "ACTIVE", scope: inventory.restroomId ? "RESTROOM" : "VENUE", venueId: inventory.venueId, restroomId: inventory.restroomId, monthlyPriceCents: campaign.pricePerPlacementMonthCents, campaignStartsAt: campaign.startsAt, campaignEndsAt: campaign.endsAt } })));
  await prisma.adCampaign.update({ where: { id: campaign.id }, data: { adId: ads[0]?.id || null, status: "ACTIVE", publishedAt: new Date() } });
}

async function requireAssignedVenue(venueId: string) {
  const user = await requireRole(["VENUE_MANAGER", "ADMIN"]);
  if ((user.role === "VENUE_MANAGER") && user.venueId !== venueId) throw new Error("Venue managers can only manage their assigned venue.");
  return user;
}

export async function createVenueContentDraft(formData: FormData) {
  const venueId = text(formData, "venueId");
  await requireAssignedVenue(venueId);
  const venue = await prisma.venue.findUniqueOrThrow({ where: { id: venueId }, select: { directPublishingApproved: true } });
  const directPublish = venue.directPublishingApproved;
  await prisma.venueContentDraft.create({ data: {
    venueId,
    contentType: text(formData, "contentType", "ANNOUNCEMENT") as VenueContentType,
    title: text(formData, "title"),
    body: text(formData, "body"),
    imageUrl: nullableText(formData, "imageUrl"),
    location: nullableText(formData, "location"),
    websiteUrl: nullableText(formData, "websiteUrl"),
    category: nullableText(formData, "category"),
    startsAt: nullableText(formData, "startsAt") ? new Date(text(formData, "startsAt")) : null,
    endsAt: nullableText(formData, "endsAt") ? new Date(text(formData, "endsAt")) : null,
    expiresAt: nullableText(formData, "expiresAt") ? new Date(text(formData, "expiresAt")) : null,
    couponCode: nullableText(formData, "couponCode"),
    qrDestination: nullableText(formData, "qrDestination"),
    approvalStatus: directPublish ? "PUBLISHED" : "SUBMITTED",
    submittedAt: new Date(),
    approvedAt: directPublish ? new Date() : null,
    publishedAt: directPublish ? new Date() : null
  } });
  revalidatePath("/portal/venue");
  revalidatePath("/admin/dashboard");
}

export async function approveVenueContentDraft(id: string, formData?: FormData) {
  const user = await requireAdmin();
  await prisma.venueContentDraft.update({ where: { id }, data: { approvalStatus: "APPROVED", approvedAt: new Date(), approvedBy: user?.id || null, adminNote: formData ? nullableText(formData, "adminNote") : null } });
  revalidatePath("/admin/dashboard");
  revalidatePath("/portal/venue");
}

export async function rejectVenueContentDraft(id: string, formData?: FormData) {
  const user = await requireAdmin();
  await prisma.venueContentDraft.update({ where: { id }, data: { approvalStatus: "REJECTED", rejectedAt: new Date(), rejectedBy: user?.id || null, rejectionReason: formData ? nullableText(formData, "rejectionReason") : null } });
  revalidatePath("/admin/dashboard");
  revalidatePath("/portal/venue");
}

export async function updateAdvertiserCampaign(id: string, formData: FormData) {
  const user = await requireRole(["ADVERTISER", "ADMIN"] as any);
  const existing = await prisma.adCampaign.findUnique({ where: { id } });

  if (!existing || (user.role === "ADVERTISER" && existing.advertiserId !== user.advertiserId)) {
    throw new Error("Campaign not found or not permitted.");
  }

  const budgetCents =
    intValue(formData, "budgetDollars", Math.round((existing.budgetCents || existing.totalAmountCents) / 100)) * 100;

  await prisma.adCampaign.update({
    where: { id },
    data: campaignEditableData(formData, budgetCents) as any
  });

  await prisma.adCreative.create({
    data: {
      campaignId: id,
      advertiserId: existing.advertiserId,
      kind: text(formData, "creativeKind", "IMAGE") as any,
      imageUrl: nullableText(formData, "creativeUrl"),
      headline: text(formData, "headline", existing.headline),
      body: text(formData, "body", existing.body),
      callToAction: text(formData, "ctaText", existing.ctaText),
      destinationUrl: text(formData, "targetUrl", existing.targetUrl),
      approvalStatus: "SUBMITTED" as any
    }
  });

  revalidatePath("/portal/advertiser");
  revalidatePath("/admin/dashboard");
}

export async function submitAdvertiserCampaign(id: string) {
  await advertiserCampaignStatus(id, "SUBMITTED", {
    approvalStatus: "SUBMITTED",
    submittedAt: new Date()
  });
}

export async function pauseAdvertiserCampaign(id: string) {
  await advertiserCampaignStatus(id, "PAUSED", {});
}

export async function resumeAdvertiserCampaign(id: string) {
  await advertiserCampaignStatus(id, "ACTIVE", {});
}

export async function archiveAdvertiserCampaign(id: string) {
  await advertiserCampaignStatus(id, "ARCHIVED", {});
}

async function advertiserCampaignStatus(id: string, status: any, extra: any) {
  const user = await requireRole(["ADVERTISER", "ADMIN"] as any);
  const existing = await prisma.adCampaign.findUnique({ where: { id } });

  if (!existing || (user.role === "ADVERTISER" && existing.advertiserId !== user.advertiserId)) {
    throw new Error("Campaign not found or not permitted.");
  }

  await prisma.adCampaign.update({
    where: { id },
    data: { status, ...extra }
  });

  revalidatePath("/portal/advertiser");
  revalidatePath("/admin/dashboard");
}

function campaignEditableData(formData: FormData, budgetCents: number) {
  const targetType = text(formData, "targetType", "GLOBAL_NETWORK");

  return {
    name: text(formData, "name", "Draft campaign"),
    businessName: text(formData, "businessName"),
    headline: text(formData, "headline"),
    body: text(formData, "body"),
    description: nullableText(formData, "description"),
    creativeUrl: nullableText(formData, "creativeUrl"),
    targetUrl: text(formData, "targetUrl", "#"),
    ctaText: text(formData, "ctaText", "Learn More"),
    budgetCents,
    remainingBudgetCents: budgetCents,
    targetType: targetType as any,
    targetStates: formData.getAll("targetStates").map(String).filter(Boolean),
    targetCities: formData.getAll("targetCities").map(String).filter(Boolean),
    targetVenueIds: formData.getAll("targetVenueIds").map(String).filter(Boolean),
    targetVenueTypes: formData.getAll("targetVenueTypes").map(String).filter(Boolean)
  };
}

export async function publishVenueContentDraft(id: string) {
  await requireAdmin();

  await prisma.venueContentDraft.update({
    where: { id },
    data: {
      approvalStatus: "PUBLISHED",
      publishedAt: new Date()
    }
  });

  revalidatePath("/admin/dashboard");
  revalidatePath("/portal/venue");
}

export async function createVenueMediaAsset(formData: FormData) {
  const venueId = text(formData, "venueId");

  await requireAssignedVenue(venueId);

  await prisma.venueMediaAsset.create({
    data: {
      venueId,
      assetType: text(formData, "assetType", "IMAGE") as any,
      title: text(formData, "title"),
      url: text(formData, "url"),
      altText: nullableText(formData, "altText"),
      galleryName: nullableText(formData, "galleryName")
    }
  });

  revalidatePath("/portal/venue");
}

export async function submitFinishedAdvertiserAd(formData: FormData) {
  const user = await requireRole(["ADVERTISER", "ADMIN"] as any);
  const advertiserId = user.role === "ADVERTISER" ? user.advertiserId : nullableText(formData, "advertiserId");
  if (!advertiserId) throw new Error("An advertiser profile is required before submitting an ad.");
  const businessName = text(formData, "businessName");
  const targetUrl = text(formData, "targetUrl", "#");
  const image = formData.get("creativeImage");
  const imageName = image instanceof File ? image.name : "uploaded-ad-image";
  await prisma.adCampaign.create({
    data: {
      advertiserId,
      name: `${businessName} finished ad upload`,
      businessName,
      headline: `${businessName} finished ad`,
      body: `Uploaded finished 4:3 sponsor panel image: ${imageName}`,
      creativeUrl: imageName,
      targetUrl,
      ctaText: "Learn More",
      status: "SUBMITTED",
      approvalStatus: "SUBMITTED",
      submittedAt: new Date(),
      creatives: { create: [{ advertiserId, kind: "BANNER" as any, imageUrl: imageName, headline: `${businessName} finished ad`, body: "Finished 4:3 sponsor panel submitted for review and publishing.", callToAction: "Learn More", destinationUrl: targetUrl, approvalStatus: "SUBMITTED" as any }] }
    }
  });
  revalidatePath("/portal/advertiser");
  revalidatePath("/portal/advertiser/upload");
  revalidatePath("/portal/advertiser/campaigns");
  redirect("/portal/advertiser/campaigns?submitted=1");
}

export async function updateAdvertiserPortalProfile(formData: FormData) {
  const user = await requireRole(["ADVERTISER", "ADMIN"] as any);
  const advertiserId = user.role === "ADVERTISER" ? user.advertiserId : nullableText(formData, "advertiserId");
  if (!advertiserId) throw new Error("An advertiser profile is required before updating profile details.");
  const businessName = text(formData, "businessName");
  await prisma.advertiser.update({
    where: { id: advertiserId },
    data: {
      name: businessName,
      portalNote: JSON.stringify({ website: text(formData, "website"), phone: text(formData, "phone"), category: text(formData, "category") })
    }
  });
  revalidatePath("/portal/advertiser");
  revalidatePath("/portal/advertiser/profile");
}
