"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AdScope, AdStatus, AnalyticsEventType, ContentBlockType, IssueStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { slugify } from "./format";
import { requireUser } from "./auth";

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
  const user = await requireUser(["ADMIN", "VENUE"]);
  const venueId = text(formData, "venueId");
  if (user.role === "VENUE" && user.venueId !== venueId) throw new Error("Venue accounts can only update their assigned venue.");
  await prisma.restroom.create({ data: { venueId, name: text(formData, "name"), floor: nullableText(formData, "floor"), placement: nullableText(formData, "placement") } });
  revalidatePath("/admin/venues");
  revalidatePath("/admin/qr");
  revalidatePath("/portal/venue");
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
  await requireUser(["ADMIN"]);
  const ad = await prisma.ad.create({ data: adData(formData) });
  await publishAdToSlot(ad.id, formData);
  revalidatePath("/admin/ads");
  revalidatePath("/admin/issue-builder");
  revalidatePath("/");
  redirect("/admin/ads");
}

export async function updateAd(id: string, formData: FormData) {
  const user = await requireUser(["ADMIN", "ADVERTISER"]);
  if (user.role === "ADVERTISER") {
    const existing = await prisma.ad.findUnique({ where: { id }, select: { advertiserId: true } });
    if (!existing || existing.advertiserId !== user.advertiserId) throw new Error("Advertiser accounts can only update their own ads.");
  }
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
