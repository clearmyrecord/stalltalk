import { CampaignTargetType, PottyFavorQrAsset, PottyFavorCampaign } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const targetPriority: CampaignTargetType[] = ["sticker", "restroom", "venue", "zip", "city", "state", "default"];

export function parseUserAgent(userAgent: string) {
  const deviceType = /iPad|Tablet/i.test(userAgent) ? "tablet" : /iPhone|Android|Mobile/i.test(userAgent) ? "mobile" : "desktop";
  const browser = /Edg/i.test(userAgent) ? "Edge" : /Chrome|CriOS/i.test(userAgent) ? "Chrome" : /Safari/i.test(userAgent) ? "Safari" : /Firefox/i.test(userAgent) ? "Firefox" : "Other";
  const os = /iPhone|iPad/i.test(userAgent) ? "iOS" : /Android/i.test(userAgent) ? "Android" : /Mac/i.test(userAgent) ? "macOS" : /Windows/i.test(userAgent) ? "Windows" : /Linux/i.test(userAgent) ? "Linux" : "Other";
  return { deviceType, browser, os };
}

export function campaignTargetValue(asset: PottyFavorQrAsset, type: CampaignTargetType) {
  if (type === "sticker") return asset.qrId;
  if (type === "restroom") return `${asset.venueSlug}:${asset.restroomName}`;
  if (type === "venue") return asset.venueSlug;
  if (type === "zip") return asset.zip;
  if (type === "city") return asset.city;
  if (type === "state") return asset.state;
  return "default";
}

export async function findBestCampaign(asset: PottyFavorQrAsset, now = new Date()) {
  const targetValues = targetPriority.map((targetType) => ({ targetType, targetValue: campaignTargetValue(asset, targetType) }));
  const campaigns = await prisma.pottyFavorCampaign.findMany({
    where: {
      active: true,
      OR: targetValues,
      AND: [{ OR: [{ startDate: null }, { startDate: { lte: now } }] }, { OR: [{ endDate: null }, { endDate: { gte: now } }] }]
    },
    orderBy: { updatedAt: "desc" }
  });
  return targetPriority.map((type) => campaigns.find((campaign) => campaign.targetType === type && campaign.targetValue === campaignTargetValue(asset, type))).find(Boolean) || null;
}

export type CampaignWithScans = PottyFavorCampaign & { scanCount: number };
