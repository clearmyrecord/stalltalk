import Link from "next/link";
import { redirect } from "next/navigation";
import { archiveAdvertiserCampaign, pauseAdvertiserCampaign, resumeAdvertiserCampaign, signOutAction, submitAdvertiserCampaign, updateAdvertiserCampaign } from "@/lib/actions";
import { authEnvStatus, currentUser } from "@/lib/auth";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { stripeEnvStatus } from "@/lib/stripe";
import { PRICE_PER_PLACEMENT_MONTH_CENTS, flightStatus, normalizeFlightMonth } from "@/lib/campaign-flights";
import { AdvertiserCampaignForm } from "@/components/AdvertiserCampaignForm";

export const dynamic = "force-dynamic";

function missingDb(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return /does not exist|P2021|AdSlotInventory|AdCampaign|AdCampaignPlacement|User/i.test(message);
}
function badge(status: string) { return `rounded-full border-2 border-ink px-2 py-1 text-xs font-black uppercase ${["APPROVED", "PAID", "ACTIVE"].includes(status) ? "bg-green-100" : status === "REJECTED" ? "bg-stallRed text-white" : "bg-stallYellow"}`; }

export default async function AdvertiserPortalPage({ searchParams }: { searchParams: Promise<{ city?: string; venue?: string; month?: string; stripe?: string }> }) {
  const filters = await searchParams;
  const auth = authEnvStatus();
  const stripe = stripeEnvStatus();
  const user = await currentUser();
  if (auth.isConfigured && (!user || user.role !== "ADVERTISER")) redirect("/signin?error=role");
  const whereAdvertiser = user?.role === "ADVERTISER" && user.advertiserId ? { id: user.advertiserId } : {};
  const selectedStartMonth = normalizeFlightMonth(filters.month || "2026-07");
  try {
    const [advertisers, venues, inventory, campaigns, events, invoices] = await Promise.all([
      prisma.advertiser.findMany({ where: whereAdvertiser, orderBy: { name: "asc" } }),
      prisma.venue.findMany({ orderBy: [{ city: "asc" }, { name: "asc" }] }),
      prisma.adSlotInventory.findMany({ where: { status: "OPEN", ...(filters.month ? { month: filters.month } : {}), ...(filters.venue ? { venueId: filters.venue } : {}), ...(filters.city ? { venue: { city: filters.city } } : {}) }, include: { venue: true, restroom: true, qrCode: true, toiletLocation: true }, orderBy: [{ month: "asc" }, { slotNumber: "asc" }] }),
      prisma.adCampaign.findMany({ where: user?.role === "ADVERTISER" && user.advertiserId ? { advertiserId: user.advertiserId } : {}, include: { advertiser: true, inventory: { include: { venue: true, restroom: true, qrCode: true } }, placements: { include: { inventory: { include: { venue: true, restroom: true, qrCode: true, toiletLocation: true } } } }, payments: true, creatives: true, invoices: true }, orderBy: { createdAt: "desc" } }),
      prisma.analyticsEvent.findMany({ where: user?.role === "ADVERTISER" && user.advertiserId ? { advertiserId: user.advertiserId } : {}, include: { venue: true }, orderBy: { createdAt: "desc" }, take: 500 }),
      prisma.advertiserInvoice.findMany({ where: user?.role === "ADVERTISER" && user.advertiserId ? { advertiserId: user.advertiserId } : {}, include: { campaign: true, advertiser: true }, orderBy: { createdAt: "desc" } })
    ]);
    const selectedAdvertiser = advertisers[0];
    const cities = [...new Set(venues.map((venue) => venue.city))];
    const months = [...new Set(inventory.map((slot) => slot.month).concat(["2026-07", "2026-08", "2026-09"]))].sort();
    const slotIdentity = inventory.map((slot) => ({ venueId: slot.venueId, restroomId: slot.restroomId, qrCodeId: slot.qrCodeId, toiletLocationId: slot.toiletLocationId, slotNumber: slot.slotNumber }));
    const unavailable = slotIdentity.length ? await prisma.adCampaignPlacement.findMany({ where: { inventory: { OR: slotIdentity }, campaign: { status: { in: ["PAID", "ACTIVE"] }, flightStartMonth: { lte: selectedStartMonth }, flightEndMonth: { gte: selectedStartMonth } } }, include: { inventory: true } }) : [];
    const unavailableKeys = new Set(unavailable.map((placement) => `${placement.inventory.venueId}:${placement.inventory.restroomId}:${placement.inventory.qrCodeId}:${placement.inventory.toiletLocationId}:${placement.inventory.slotNumber}`));
    const availableInventory = inventory.filter((slot) => !unavailableKeys.has(`${slot.venueId}:${slot.restroomId}:${slot.qrCodeId}:${slot.toiletLocationId}:${slot.slotNumber}`));
const placementOptions = availableInventory.map((slot) => ({
  id: slot.id,
  month: slot.month,
  venueName: slot.venue.name,
  restroomName: slot.restroom?.name || "",
  qrCode: slot.qrCode?.qrSlug || "",
  toiletLabel: slot.toiletLocation?.label || "",
  slotNumber: slot.slotNumber,
  priceCents: slot.priceCents,
  venueId: slot.venueId,
  city: slot.venue.city,
  state: slot.venue.state,
  venueType: slot.venue.venueType
}));

const eventCount = (type: string) =>
  events.filter((event) => event.type === type).length;

const impressions =
  eventCount("AD_IMPRESSION") +
  campaigns.reduce((sum, campaign) => sum + (campaign.impressionsServed || 0), 0);

const clicks =
  eventCount("AD_CLICK") +
  campaigns.reduce((sum, campaign) => sum + (campaign.clicksServed || 0), 0);

const qrScans =
  eventCount("SCAN") +
  campaigns.reduce((sum, campaign) => sum + (campaign.qrScans || 0), 0);

const spend = campaigns.reduce(
  (sum, campaign) =>
    sum + (campaign.totalAmountCents - (campaign.remainingBudgetCents || 0)),
  0
);

const coverage = new Set(
  campaigns.flatMap((campaign) =>
    campaign.placements
      .map((placement) => placement.inventory.venueId)
      .concat(campaign.targetVenueIds || [])
  )
).size;

const statusCount = (statuses: string[]) =>
  campaigns.filter(
    (campaign) =>
      statuses.includes(campaign.status) ||
      statuses.includes(campaign.approvalStatus)
  ).length;

const ctr = impressions ? ((clicks / impressions) * 100).toFixed(2) : "0.00";
  } catch (error) {
    if (!missingDb(error)) throw error;
    return <main className="min-h-screen bg-paper p-8 text-ink"><h1 className="font-display text-7xl uppercase">Advertiser Dashboard</h1><Setup message="Run Prisma migrations to create Phase 2B advertiser inventory tables." /></main>;
  }
}

function Setup({ message }: { message: string }) { return <p className="mt-4 rounded-2xl border-4 border-ink bg-stallYellow p-5 font-black shadow-brutal">{message}</p>; }
