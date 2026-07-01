import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { calculateFlightTotal } from "@/lib/campaign-flights";

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signature)
    return NextResponse.json(
      { received: false, error: "Stripe webhook signing is not configured." },
      { status: 503 },
    );
  const event = stripe.webhooks.constructEvent(payload, signature, secret);
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.payment_status !== "paid")
      return NextResponse.json({ received: true, type: event.type });
    if (session.metadata?.flow === "direct_inventory_checkout") {
      await finalizeDirectInventoryCheckout(session);
      return NextResponse.json({ received: true, type: event.type });
    }
    const campaignId = String(session.metadata?.campaignId || "");
    if (campaignId) {
      const campaign = await prisma.adCampaign.findUnique({
        where: { id: campaignId },
        include: {
          placements: { include: { inventory: true } },
          inventory: true,
        },
      });
      if (campaign) {
        const inventory = campaign.placements.length
          ? campaign.placements.map((placement) => placement.inventory)
          : campaign.inventory
            ? [campaign.inventory]
            : [];
        const conflicts = await findOverlappingCampaignPlacements(
          inventory,
          campaign.flightStartMonth,
          campaign.flightEndMonth,
          campaign.id,
        );
        if (conflicts.length) {
          await prisma.adCampaign.update({
            where: { id: campaignId },
            data: {
              status: "REJECTED",
              approvalStatus: "REJECTED",
              rejectedAt: new Date(),
              rejectionReason:
                "A selected placement became unavailable for this flight before payment completed.",
            },
          });
          await prisma.payment.updateMany({
            where: { stripeSessionId: session.id },
            data: {
              status: "FAILED",
              stripePaymentIntentId:
                typeof session.payment_intent === "string"
                  ? session.payment_intent
                  : null,
            },
          });
        } else {
          const placementCount = Math.max(
            1,
            campaign.placementCount ||
              inventory.length ||
              campaign.locationCount,
          );
          const flightMonths = Math.max(
            1,
            campaign.flightMonths || campaign.months,
          );
          const totalAmountCents = calculateFlightTotal(
            placementCount,
            flightMonths,
          );
          const paidCampaign = await prisma.adCampaign.update({
            where: { id: campaignId },
            data: {
              status: "PAID",
              paidAt: new Date(),
              stripeSessionId: session.id,
              placementCount,
              locationCount: placementCount,
              flightMonths,
              months: flightMonths,
              priceCents: totalAmountCents,
              totalAmountCents,
            },
            include: { inventory: true },
          });
          await prisma.payment.updateMany({
            where: { stripeSessionId: session.id },
            data: {
              status: "SUCCEEDED",
              stripePaymentIntentId:
                typeof session.payment_intent === "string"
                  ? session.payment_intent
                  : null,
            },
          });
          if (paidCampaign.approvalStatus === "APPROVED")
            await publishPaidCampaign(paidCampaign.id);
        }
      }
    }
  }
  return NextResponse.json({ received: true, type: event.type });
}

async function findOverlappingCampaignPlacements(
  inventory: Array<{
    venueId: string;
    restroomId: string | null;
    qrCodeId: string | null;
    toiletLocationId: string | null;
    slotNumber: number;
  }>,
  flightStartMonth: string,
  flightEndMonth: string,
  excludeCampaignId?: string,
) {
  if (!inventory.length) return [];
  const slotIdentity = inventory.map((slot) => ({
    venueId: slot.venueId,
    restroomId: slot.restroomId,
    qrCodeId: slot.qrCodeId,
    toiletLocationId: slot.toiletLocationId,
    slotNumber: slot.slotNumber,
  }));
  return prisma.adCampaignPlacement.findMany({
    where: {
      campaignId: excludeCampaignId ? { not: excludeCampaignId } : undefined,
      inventory: { OR: slotIdentity },
      campaign: {
        status: { in: ["PAID", "ACTIVE"] },
        flightStartMonth: { lte: flightEndMonth },
        flightEndMonth: { gte: flightStartMonth },
      },
    },
  });
}

async function publishPaidCampaign(campaignId: string) {
  const campaign = await prisma.adCampaign.findUnique({
    where: { id: campaignId },
    include: {
      placements: { include: { inventory: true } },
      inventory: true,
      advertiser: true,
    },
  });
  if (
    !campaign ||
    campaign.status !== "PAID" ||
    campaign.approvalStatus !== "APPROVED"
  )
    return;
  const placements = campaign.placements.length
    ? campaign.placements.map((placement) => placement.inventory)
    : campaign.inventory
      ? [campaign.inventory]
      : [];
  if (!placements.length) return;
  const ads = await Promise.all(
    placements.map((inventory) =>
      prisma.ad.create({
        data: {
          publisherId: campaign.advertiser.publisherId,
          advertiserId: campaign.advertiserId,
          businessName: campaign.businessName,
          title: campaign.headline,
          offer: campaign.body,
          artworkUrl: campaign.creativeUrl,
          ctaText: campaign.ctaText,
          targetUrl: campaign.targetUrl,
          status: "ACTIVE",
          scope: inventory.restroomId ? "RESTROOM" : "VENUE",
          venueId: inventory.venueId,
          restroomId: inventory.restroomId,
          monthlyPriceCents: campaign.pricePerPlacementMonthCents,
          campaignStartsAt: campaign.startsAt,
          campaignEndsAt: campaign.endsAt,
        },
      }),
    ),
  );
  await prisma.adCampaign.update({
    where: { id: campaign.id },
    data: {
      adId: ads[0]?.id || null,
      status: "ACTIVE",
      publishedAt: new Date(),
    },
  });
}

async function finalizeDirectInventoryCheckout(session: any) {
  const metadata = session.metadata || {};
  const inventoryId = String(metadata.inventoryId || "");
  const campaignId = String(metadata.campaignId || "");
  const advertiserId = String(metadata.advertiserId || "");
  if (!inventoryId || !campaignId || !advertiserId) return;

  await prisma.$transaction(async (tx) => {
    const inventory = await tx.adSlotInventory.findUnique({
      where: { id: inventoryId },
    });
    if (!inventory || inventory.status !== "OPEN") {
      await tx.payment.updateMany({
        where: { stripeSessionId: session.id },
        data: {
          status: "FAILED",
          stripePaymentIntentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : null,
        },
      });
      return;
    }

    const campaign = await tx.adCampaign.findFirst({
      where: { id: campaignId, advertiserId },
      include: { advertiser: true, ad: true },
    });
    if (!campaign) return;
    await tx.adSlotInventory.update({
      where: { id: inventory.id },
      data: { status: "SOLD" },
    });

    let adId = campaign.adId || String(metadata.adId || "") || null;
    if (!adId) {
      const ad = await tx.ad.create({
        data: {
          publisherId: campaign.advertiser.publisherId,
          advertiserId,
          businessName: campaign.businessName,
          title: campaign.headline,
          offer: campaign.body,
          artworkUrl: campaign.creativeUrl,
          ctaText: campaign.ctaText,
          targetUrl: campaign.targetUrl,
          status: "ACTIVE",
          scope: inventory.restroomId ? "RESTROOM" : "VENUE",
          venueId: inventory.venueId,
          restroomId: inventory.restroomId,
          monthlyPriceCents: inventory.priceCents,
          campaignStartsAt: inventory.startsAt,
          campaignEndsAt: inventory.endsAt,
        },
      });
      adId = ad.id;
    } else {
      await tx.ad.updateMany({
        where: { id: adId, advertiserId },
        data: {
          status: "ACTIVE",
          scope: inventory.restroomId ? "RESTROOM" : "VENUE",
          venueId: inventory.venueId,
          restroomId: inventory.restroomId,
          monthlyPriceCents: inventory.priceCents,
          campaignStartsAt: inventory.startsAt,
          campaignEndsAt: inventory.endsAt,
        },
      });
    }

    await tx.adCampaignPlacement.upsert({
      where: {
        campaignId_inventoryId: {
          campaignId: campaign.id,
          inventoryId: inventory.id,
        },
      },
      update: {},
      create: { campaignId: campaign.id, inventoryId: inventory.id },
    });
    await tx.adCampaign.update({
      where: { id: campaign.id },
      data: {
        inventoryId: inventory.id,
        adId,
        status: "ACTIVE",
        approvalStatus: "APPROVED",
        paidAt: new Date(),
        publishedAt: new Date(),
        approvedAt: campaign.approvedAt || new Date(),
        stripeSessionId: session.id,
      },
    });
    await tx.payment.updateMany({
      where: { stripeSessionId: session.id },
      data: {
        status: "SUCCEEDED",
        stripePaymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null,
      },
    });
  });
}
