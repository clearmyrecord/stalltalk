"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AdScope, AdStatus, AnalyticsEventType, ContentBlockType, IssueStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { slugify } from "./format";

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
  const name = text(formData, "name");
  await prisma.publisher.create({ data: { name, slug: text(formData, "slug", slugify(name)) || slugify(name), contactEmail: text(formData, "contactEmail") } });
  revalidatePath("/admin/publishers");
}

export async function createDistributor(formData: FormData) {
  const name = text(formData, "name");
  await prisma.distributor.create({ data: { publisherId: text(formData, "publisherId"), name, slug: text(formData, "slug", slugify(name)) || slugify(name), contactEmail: text(formData, "contactEmail"), commissionRate: intValue(formData, "commissionRate", 15) / 100 } });
  revalidatePath("/admin/distributors");
}

export async function createVenue(formData: FormData) {
  const name = text(formData, "name");
  await prisma.venue.create({ data: { publisherId: text(formData, "publisherId"), distributorId: nullableText(formData, "distributorId"), name, slug: text(formData, "slug", slugify(name)) || slugify(name), city: text(formData, "city"), state: text(formData, "state"), address: text(formData, "address") } });
  revalidatePath("/admin/venues");
}

export async function createRestroom(formData: FormData) {
  await prisma.restroom.create({ data: { venueId: text(formData, "venueId"), name: text(formData, "name"), floor: nullableText(formData, "floor"), placement: nullableText(formData, "placement") } });
  revalidatePath("/admin/venues");
  revalidatePath("/admin/qr");
}

export async function createQrCode(formData: FormData) {
  const code = text(formData, "code", `ST-${Date.now()}`);
  const venueId = nullableText(formData, "venueId");
  const restroomId = nullableText(formData, "restroomId");
  const venue = venueId ? await prisma.venue.findUnique({ where: { id: venueId } }) : null;
  await prisma.qrCode.create({ data: { publisherId: text(formData, "publisherId"), venueId, restroomId, code, label: text(formData, "label", code), destination: venue ? `/issue/${venue.slug}?qr=${code}` : `/issue/unassigned?qr=${code}`, status: venueId ? "ASSIGNED" : "INVENTORY" } });
  revalidatePath("/admin/qr");
}

export async function createAdvertiser(formData: FormData) {
  const name = text(formData, "name");
  await prisma.advertiser.create({ data: { publisherId: text(formData, "publisherId"), name, slug: text(formData, "slug", slugify(name)) || slugify(name), contactEmail: text(formData, "contactEmail"), portalNote: nullableText(formData, "portalNote") } });
  revalidatePath("/admin/advertisers");
  revalidatePath("/portal/advertiser");
  revalidatePath("/");
}

export async function createAd(formData: FormData) {
  const ad = await prisma.ad.create({ data: adData(formData) });
  await publishAdToSlot(ad.id, formData);
  revalidatePath("/admin/ads");
  revalidatePath("/admin/issue-builder");
  revalidatePath("/");
  redirect("/admin/ads");
}

export async function updateAd(id: string, formData: FormData) {
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
  const title = text(formData, "title");
  await prisma.article.create({ data: { publisherId: text(formData, "publisherId"), categoryId: nullableText(formData, "categoryId"), title, slug: text(formData, "slug", slugify(title)) || slugify(title), excerpt: text(formData, "excerpt"), body: text(formData, "body"), imageUrl: nullableText(formData, "imageUrl"), status: text(formData, "status", "DRAFT") as IssueStatus, scheduledAt: nullableText(formData, "scheduledAt") ? new Date(text(formData, "scheduledAt")) : null, publishedAt: text(formData, "status") === "PUBLISHED" ? new Date() : null } });
  revalidatePath("/admin/articles");
}

export async function createIssue(formData: FormData) {
  const issue = await prisma.issue.create({ data: issueData(formData) });
  await saveContentBlocks(issue.id, formData);
  await saveAdSlots(issue.id, formData);
  revalidatePath("/admin/issues");
  redirect(`/admin/issues/${issue.id}/edit`);
}

export async function updateIssue(id: string, formData: FormData) {
  await prisma.issue.update({ where: { id }, data: issueData(formData) });
  await prisma.issueContentBlock.deleteMany({ where: { issueId: id } });
  await prisma.issueAdSlot.deleteMany({ where: { issueId: id } });
  await saveContentBlocks(id, formData);
  await saveAdSlots(id, formData);
  revalidatePath("/admin/issues");
  revalidatePath(`/admin/issues/${id}/edit`);
}

function issueData(formData: FormData) {
  const status = text(formData, "status", "DRAFT") as IssueStatus;
  return { publisherId: text(formData, "publisherId"), venueId: text(formData, "venueId"), restroomId: nullableText(formData, "restroomId"), qrCodeId: nullableText(formData, "qrCodeId"), title: text(formData, "title"), month: text(formData, "month"), year: intValue(formData, "year", new Date().getFullYear()), issueNumber: intValue(formData, "issueNumber", 1), status, scheduledAt: nullableText(formData, "scheduledAt") ? new Date(text(formData, "scheduledAt")) : null, publishedAt: status === "PUBLISHED" ? new Date() : null };
}

async function saveContentBlocks(issueId: string, formData: FormData) {
  const blocks = Array.from({ length: 8 }, (_, index) => {
    const row = index + 1;
    return { issueId, articleId: nullableText(formData, `blockArticle${row}`), type: text(formData, `blockType${row}`, "ARTICLE") as ContentBlockType, title: text(formData, `blockTitle${row}`), body: text(formData, `blockBody${row}`), imageUrl: nullableText(formData, `blockImage${row}`), sortOrder: row, layout: { zone: `slot-${row}`, locked: false } };
  }).filter((block) => block.title || block.body || block.articleId);
  if (blocks.length) await prisma.issueContentBlock.createMany({ data: blocks });
}

async function saveAdSlots(issueId: string, formData: FormData) {
  const slots = Array.from({ length: 8 }, (_, index) => ({ slotNumber: index + 1, adId: text(formData, `slot${index + 1}`) })).filter((slot) => slot.adId).map((slot) => ({ ...slot, issueId }));
  if (slots.length) await prisma.issueAdSlot.createMany({ data: slots });
}

export async function recordAnalytics(formData: FormData) {
  await prisma.analyticsEvent.create({ data: { publisherId: nullableText(formData, "publisherId"), venueId: nullableText(formData, "venueId"), restroomId: nullableText(formData, "restroomId"), qrCodeId: nullableText(formData, "qrCodeId"), issueId: nullableText(formData, "issueId"), advertiserId: nullableText(formData, "advertiserId"), adId: nullableText(formData, "adId"), type: text(formData, "type") as AnalyticsEventType, slotNumber: intValue(formData, "slotNumber") || null, visitorId: nullableText(formData, "visitorId"), sessionId: nullableText(formData, "sessionId"), durationMs: intValue(formData, "durationMs") || null, path: nullableText(formData, "path") } });
}

export async function deleteAd(id: string) { await prisma.ad.delete({ where: { id } }); revalidatePath("/admin/ads"); }
export async function deleteVenue(id: string) { await prisma.venue.delete({ where: { id } }); revalidatePath("/admin/venues"); }
export async function deleteIssue(id: string) { await prisma.issue.delete({ where: { id } }); revalidatePath("/admin/issues"); }

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
  await prisma.adSlotInventory.create({ data: { venueId: text(formData, "venueId"), restroomId: nullableText(formData, "restroomId"), qrCodeId: nullableText(formData, "qrCodeId"), slotNumber: intValue(formData, "slotNumber", 1), month: text(formData, "month"), priceCents: intValue(formData, "priceDollars", 50) * 100, status: text(formData, "status", "OPEN") as any } });
  revalidatePath("/admin/venues");
  revalidatePath("/portal/advertiser");
}

export async function createAdvertiserCampaign(formData: FormData) {
  const inventoryIds = formData.getAll("inventoryIds").map(String).filter(Boolean);
  const singleInventoryId = text(formData, "inventoryId");
  const placements = inventoryIds.length ? inventoryIds : singleInventoryId ? [singleInventoryId] : [];
  const firstInventoryId = placements[0] || null;
  const months = Math.max(1, intValue(formData, "months", 1));
  const locationCount = Math.max(1, placements.length || intValue(formData, "locationCount", 1));
  const priceCents = 5000 * months * locationCount;
  const startsAt = nullableText(formData, "startsAt") ? new Date(text(formData, "startsAt")) : null;
  const endsAt = startsAt ? new Date(startsAt) : null;
  if (endsAt) endsAt.setMonth(endsAt.getMonth() + months);

  const campaign = await prisma.adCampaign.create({
    data: {
      advertiserId: text(formData, "advertiserId"),
      inventoryId: firstInventoryId,
      name: text(formData, "name", "Draft campaign"),
      businessName: text(formData, "businessName"),
      headline: text(formData, "headline"),
      body: text(formData, "body"),
      creativeUrl: nullableText(formData, "creativeUrl"),
      targetUrl: text(formData, "targetUrl", "#"),
      ctaText: text(formData, "ctaText", "Learn More"),
      months,
      locationCount,
      priceCents,
      status: "DRAFT",
      approvalStatus: "SUBMITTED",
      submittedAt: new Date(),
      startsAt,
      endsAt
    }
  });

  if (placements.length) await prisma.adSlotInventory.updateMany({ where: { id: { in: placements }, status: "OPEN" }, data: { status: "RESERVED" } });
  revalidatePath("/portal/advertiser");
  revalidatePath("/admin/dashboard");
}

export async function approveAdCampaign(id: string, formData?: FormData) {
  const { currentUser } = await import("./auth");
  const user = await currentUser();
  const campaign = await prisma.adCampaign.update({ where: { id }, data: { approvalStatus: "APPROVED", approvedAt: new Date(), approvedBy: user?.id || null, adminApprovalNote: formData ? nullableText(formData, "adminApprovalNote") : null }, include: { inventory: true } });
  if (campaign.status === "PAID") await publishPaidCampaign(id);
  revalidatePath("/admin/ads");
  revalidatePath("/admin/dashboard");
  revalidatePath("/portal/advertiser");
}

export async function rejectAdCampaign(id: string, formData?: FormData) {
  const { currentUser } = await import("./auth");
  const user = await currentUser();
  await prisma.adCampaign.update({ where: { id }, data: { approvalStatus: "REJECTED", status: "REJECTED", rejectedAt: new Date(), rejectedBy: user?.id || null, rejectionReason: formData ? nullableText(formData, "rejectionReason") : null } });
  revalidatePath("/admin/ads");
  revalidatePath("/admin/dashboard");
  revalidatePath("/portal/advertiser");
}

async function publishPaidCampaign(campaignId: string) {
  const campaign = await prisma.adCampaign.findUnique({ where: { id: campaignId }, include: { inventory: true, advertiser: true } });
  if (!campaign || campaign.status !== "PAID" || campaign.approvalStatus !== "APPROVED" || !campaign.inventory) return;
  const ad = await prisma.ad.create({ data: { publisherId: campaign.advertiser.publisherId, advertiserId: campaign.advertiserId, businessName: campaign.businessName, title: campaign.headline, offer: campaign.body, artworkUrl: campaign.creativeUrl, ctaText: campaign.ctaText, targetUrl: campaign.targetUrl, status: "ACTIVE", scope: campaign.inventory.restroomId ? "RESTROOM" : "VENUE", venueId: campaign.inventory.venueId, restroomId: campaign.inventory.restroomId, monthlyPriceCents: 5000, campaignStartsAt: campaign.startsAt, campaignEndsAt: campaign.endsAt } });
  await prisma.adCampaign.update({ where: { id: campaign.id }, data: { adId: ad.id, status: "ACTIVE", publishedAt: new Date() } });
}

export async function createVenueContentDraft(formData: FormData) {
  await prisma.venueContentDraft.create({ data: { venueId: text(formData, "venueId"), title: text(formData, "title"), body: text(formData, "body"), imageUrl: nullableText(formData, "imageUrl"), approvalStatus: "SUBMITTED", submittedAt: new Date() } });
  revalidatePath("/portal/venue");
  revalidatePath("/admin/dashboard");
}

export async function approveVenueContentDraft(id: string, formData?: FormData) {
  const { currentUser } = await import("./auth");
  const user = await currentUser();
  await prisma.venueContentDraft.update({ where: { id }, data: { approvalStatus: "APPROVED", approvedAt: new Date(), approvedBy: user?.id || null, adminNote: formData ? nullableText(formData, "adminNote") : null } });
  revalidatePath("/admin/dashboard");
  revalidatePath("/portal/venue");
}

export async function rejectVenueContentDraft(id: string, formData?: FormData) {
  const { currentUser } = await import("./auth");
  const user = await currentUser();
  await prisma.venueContentDraft.update({ where: { id }, data: { approvalStatus: "REJECTED", rejectedAt: new Date(), rejectedBy: user?.id || null, rejectionReason: formData ? nullableText(formData, "rejectionReason") : null } });
  revalidatePath("/admin/dashboard");
  revalidatePath("/portal/venue");
}
