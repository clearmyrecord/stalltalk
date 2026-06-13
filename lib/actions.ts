"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AdScope, AdStatus, AnalyticsEventType, ContentBlockType, IssueStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { requireAdmin, requireRole } from "./auth";
import { slugify } from "./format";
import { calculateFlightTotal, flightDateRange, flightEndMonth, normalizeFlightMonth, PRICE_PER_PLACEMENT_MONTH_CENTS, safeFlightMonths } from "./campaign-flights";

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
  const code = text(formData, "code", `ST-${Date.now()}`);
  const venueId = nullableText(formData, "venueId");
  const restroomId = nullableText(formData, "restroomId");
  const venue = venueId ? await prisma.venue.findUnique({ where: { id: venueId } }) : null;
  await prisma.qrCode.create({ data: { publisherId: text(formData, "publisherId"), venueId, restroomId, code, label: text(formData, "label", code), destination: venue ? `/issue?venue=${venue.slug}&qr=${code}` : `/issue?qr=${code}`, status: venueId ? "ASSIGNED" : "INVENTORY" } });
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
  const ad = await prisma.ad.create({ data: adData(formData) });
  await publishAdToSlot(ad.id, formData);
  revalidatePath("/admin/ads");
  revalidatePath("/admin/issue-builder");
  revalidatePath("/");
  redirect("/admin/ads");
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
  if (slotNumber < 1 || slotNumber > 8) return;

  const scope = text(formData, "scope", "GLOBAL") as AdScope;
  if (issueId) {
    await prisma.issueAdSlot.upsert({
      where: { issueId_slotNumber: { issueId, slotNumber } },
      update: { adId, source: scope },
      create: { issueId, adId, slotNumber, source: scope }
    });
  }

  await prisma.stalltalkAdSlot.upsert({
    where: { slotNumber },
    update: adSlotData(adId, formData),
    create: { slotNumber, ...adSlotData(adId, formData) }
  });

  const campaignId = text(formData, "campaignId", `${adId}-${slotNumber}`);
  await prisma.stalltalkCampaignHistory.upsert({
    where: { campaignId },
    update: campaignHistoryData(adId, slotNumber, formData),
    create: { campaignId, ...campaignHistoryData(adId, slotNumber, formData) }
  });
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
    adSize: text(formData, "adSize", "Banner"),
    slotPublished
  };
}

export async function createArticle(formData: FormData) {
  await requireAdmin();
  const title = text(formData, "title");
  await prisma.article.create({ data: { publisherId: text(formData, "publisherId"), categoryId: nullableText(formData, "categoryId"), title, slug: text(formData, "slug", slugify(title)) || slugify(title), excerpt: text(formData, "excerpt"), body: text(formData, "body"), imageUrl: nullableText(formData, "imageUrl"), status: text(formData, "status", "DRAFT") as IssueStatus, scheduledAt: nullableText(formData, "scheduledAt") ? new Date(text(formData, "scheduledAt")) : null, publishedAt: text(formData, "status") === "PUBLISHED" ? new Date() : null } });
  revalidatePath("/admin/articles");
}

export async function createIssue(formData: FormData) {
  await requireAdmin();
  const issue = await prisma.$transaction(async (tx) => {
    const issue = await tx.issue.create({ data: issueData(formData) });
    await saveContentBlocks(issue.id, formData, tx);
    await saveAdSlots(issue.id, formData, tx);
    return issue;
  });
  revalidatePath("/admin/issues");
  redirect(`/admin/issues/${issue.id}/edit`);
}

export async function updateIssue(id: string, formData: FormData) {
  await requireAdmin();
  const expectedUpdatedAt = nullableText(formData, "updatedAt");
  const expectedDate = expectedUpdatedAt ? new Date(expectedUpdatedAt) : null;
  await prisma.$transaction(async (tx) => {
    const existing = await tx.issue.findUnique({ where: { id }, select: { status: true, publishedAt: true, updatedAt: true } });
    if (!existing) throw new Error("Issue not found.");
    if (expectedDate && existing.updatedAt.getTime() !== expectedDate.getTime()) throw new Error("This issue was changed by another editor. Refresh and try again.");
    const data = issueData(formData, existing);
    await tx.issue.update({ where: { id }, data });
    await tx.issueContentBlock.deleteMany({ where: { issueId: id } });
    await tx.issueAdSlot.deleteMany({ where: { issueId: id } });
    await saveContentBlocks(id, formData, tx);
    await saveAdSlots(id, formData, tx);
  });
  revalidatePath("/admin/issues");
  revalidatePath(`/admin/issues/${id}/edit`);
}

function issueData(formData: FormData, existing?: { status: IssueStatus; publishedAt: Date | null }) {
  const status = text(formData, "status", "DRAFT") as IssueStatus;
  const now = new Date();
  const firstPublishedAt = existing?.publishedAt || (status === "PUBLISHED" ? now : null);
  const republishedAt = existing?.publishedAt && status === "PUBLISHED" ? now : null;
  return { publisherId: text(formData, "publisherId"), venueId: text(formData, "venueId"), restroomId: nullableText(formData, "restroomId"), qrCodeId: nullableText(formData, "qrCodeId"), title: text(formData, "title"), month: text(formData, "month"), year: intValue(formData, "year", new Date().getFullYear()), issueNumber: intValue(formData, "issueNumber", 1), status, scheduledAt: nullableText(formData, "scheduledAt") ? new Date(text(formData, "scheduledAt")) : null, publishedAt: firstPublishedAt, republishedAt };
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
    title: text(formData, "title"),
    restaurantName: text(formData, "restaurantName"),
    venueId: nullableText(formData, "venueId"),
    venueIds: selectedVenueIds(formData),
    featuredImageUrl: nullableText(formData, "featuredImageUrl"),
    starRating: decimalValue(formData, "starRating"),
    cuisineType: nullableText(formData, "cuisineType"),
    address: nullableText(formData, "address"),
    city: nullableText(formData, "city"),
    state: nullableText(formData, "state"),
    websiteUrl: nullableText(formData, "websiteUrl"),
    instagramUrl: nullableText(formData, "instagramUrl"),
    facebookUrl: nullableText(formData, "facebookUrl"),
    reviewHeadline: text(formData, "reviewHeadline"),
    reviewBody: text(formData, "reviewBody"),
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
export async function deleteIssue(id: string) { await requireAdmin(); await prisma.issue.delete({ where: { id } }); revalidatePath("/admin/issues"); }

export async function signIn(formData: FormData) {
  const { authEnvStatus, createSession, verifyPassword } = await import("./auth");
  if (!authEnvStatus().isConfigured) redirect("/signin?setup=auth");
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash) || user.status !== "ACTIVE") redirect("/signin?error=credentials");
  await createSession(user.id);
  if (user.role === "ADMIN") redirect("/admin/dashboard");
  if (user.role === "VENUE") redirect("/portal/venue");
  redirect("/portal/advertiser");
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
  await requireRole(["ADVERTISER", "ADMIN"]);
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

  await prisma.adCampaign.create({
    data: {
      advertiserId: text(formData, "advertiserId"),
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
      status: "DRAFT",
      approvalStatus: "SUBMITTED",
      submittedAt: new Date(),
      startsAt,
      endsAt
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

export async function createVenueContentDraft(formData: FormData) {
  await requireRole(["VENUE", "ADMIN"]);
  await prisma.venueContentDraft.create({ data: { venueId: text(formData, "venueId"), title: text(formData, "title"), body: text(formData, "body"), imageUrl: nullableText(formData, "imageUrl"), approvalStatus: "SUBMITTED", submittedAt: new Date() } });
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
