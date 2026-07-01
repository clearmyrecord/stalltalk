import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe, stripeEnvStatus } from "@/lib/stripe";
import {
  calculateFlightTotal,
  PRICE_PER_PLACEMENT_MONTH_CENTS,
} from "@/lib/campaign-flights";

async function parseCheckoutRequest(request: Request) {
  const type = request.headers.get("content-type") || "";
  const data = type.includes("application/json")
    ? await request.json()
    : Object.fromEntries((await request.formData()).entries());
  return {
    campaignId: String(data.campaignId || ""),
    inventoryId: String(data.inventoryId || ""),
    adId: String(data.adId || ""),
  };
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN" && user.role !== "ADVERTISER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { campaignId, inventoryId, adId } = await parseCheckoutRequest(request);
  const stripeStatus = stripeEnvStatus();
  if (!stripeStatus.isConfigured)
    return NextResponse.json(
      {
        error:
          "Stripe is not configured. Set STRIPE_SECRET_KEY and NEXT_PUBLIC_SITE_URL to enable checkout.",
      },
      { status: 503 },
    );

  if (inventoryId)
    return startDirectInventoryCheckout({
      request,
      user,
      inventoryId,
      requestedAdId: adId,
      requestedCampaignId: campaignId,
    });
  return startCampaignCheckout({ request, user, campaignId });
}

async function startDirectInventoryCheckout({
  request,
  user,
  inventoryId,
  requestedAdId,
  requestedCampaignId,
}: {
  request: Request;
  user: NonNullable<Awaited<ReturnType<typeof currentUser>>>;
  inventoryId: string;
  requestedAdId?: string;
  requestedCampaignId?: string;
}) {
  if (user.role !== "ADVERTISER" || !user.advertiserId)
    return NextResponse.json(
      { error: "Advertiser profile required." },
      { status: 403 },
    );
  const inventory = await prisma.adSlotInventory.findUnique({
    where: { id: inventoryId },
    include: { venue: true, qrCode: true, issue: true },
  });
  if (!inventory || inventory.status !== "OPEN")
    return NextResponse.json(
      { error: "This sponsor slot is no longer available." },
      { status: 409 },
    );
  const advertiser = await prisma.advertiser.findUnique({
    where: { id: user.advertiserId },
  });
  if (!advertiser)
    return NextResponse.json(
      { error: "Advertiser profile not found." },
      { status: 404 },
    );

  const selectedAd = requestedAdId
    ? await prisma.ad.findFirst({
        where: { id: requestedAdId, advertiserId: advertiser.id },
      })
    : await prisma.ad.findFirst({
        where: { advertiserId: advertiser.id, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
      });
  const selectedCampaign = requestedCampaignId
    ? await prisma.adCampaign.findFirst({
        where: { id: requestedCampaignId, advertiserId: advertiser.id },
      })
    : !selectedAd
      ? await prisma.adCampaign.findFirst({
          where: { advertiserId: advertiser.id, creativeUrl: { not: null } },
          orderBy: { createdAt: "desc" },
        })
      : null;
  if (!selectedAd && !selectedCampaign)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/portal/advertiser/upload?inventoryId=${encodeURIComponent(inventory.id)}&needsAd=1`,
      303,
    );

  const amount = inventory.priceCents || PRICE_PER_PLACEMENT_MONTH_CENTS;
  const campaign =
    selectedCampaign ||
    (await prisma.adCampaign.create({
      data: {
        advertiserId: advertiser.id,
        inventoryId: inventory.id,
        adId: selectedAd?.id,
        name: `${advertiser.name} direct slot purchase`,
        businessName: selectedAd?.businessName || advertiser.name,
        headline: selectedAd?.title || `${advertiser.name} sponsor placement`,
        body: selectedAd?.offer || "Direct sponsor slot purchase",
        creativeUrl: selectedAd?.artworkUrl,
        targetUrl: selectedAd?.targetUrl || "#",
        ctaText: selectedAd?.ctaText || "Learn More",
        status: "PAYMENT_PENDING",
        approvalStatus: "APPROVED",
        approvedAt: new Date(),
        priceCents: amount,
        totalAmountCents: amount,
        pricePerPlacementMonthCents: amount,
        flightStartMonth: inventory.month,
        flightEndMonth: inventory.month,
        startsAt: inventory.startsAt,
        endsAt: inventory.endsAt,
      },
    }));

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: amount,
          product_data: {
            name: `Sponsor slot ${inventory.slotNumber}: ${inventory.venue.name}`,
          },
        },
        quantity: 1,
      },
    ],
    customer_email: advertiser.contactEmail || user.email,
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/portal/advertiser/inventory?stripe=success&inventoryId=${encodeURIComponent(inventory.id)}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/portal/advertiser/inventory?stripe=cancel&inventoryId=${encodeURIComponent(inventory.id)}`,
    metadata: {
      flow: "direct_inventory_checkout",
      advertiserId: advertiser.id,
      userId: user.id,
      inventoryId: inventory.id,
      issueId: inventory.issueId || "",
      qrCodeId: inventory.qrCodeId || "",
      venueId: inventory.venueId,
      slotNumber: String(inventory.slotNumber),
      campaignId: campaign.id,
      adId: selectedAd?.id || campaign.adId || "",
    },
  });
  await prisma.payment.create({
    data: {
      campaignId: campaign.id,
      advertiserId: advertiser.id,
      amountCents: amount,
      status: "PENDING",
      stripeSessionId: session.id,
    },
  });
  await prisma.adCampaign.update({
    where: { id: campaign.id },
    data: { status: "PAYMENT_PENDING", stripeSessionId: session.id },
  });
  return request.headers.get("content-type")?.includes("application/json")
    ? NextResponse.json({ url: session.url })
    : NextResponse.redirect(
        session.url ||
          `${process.env.NEXT_PUBLIC_SITE_URL}/portal/advertiser/inventory?stripe=checkout-unavailable`,
        303,
      );
}

async function startCampaignCheckout({
  request,
  user,
  campaignId,
}: {
  request: Request;
  user: NonNullable<Awaited<ReturnType<typeof currentUser>>>;
  campaignId: string;
}) {
  const campaign = await prisma.adCampaign.findUnique({
    where: { id: campaignId },
    include: { advertiser: true, placements: true },
  });
  if (
    !campaign ||
    (user.role === "ADVERTISER" &&
      (!user.advertiserId || campaign.advertiserId !== user.advertiserId))
  )
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  const placementCount = Math.max(
    1,
    campaign.placements.length ||
      campaign.placementCount ||
      campaign.locationCount,
  );
  const flightMonths = Math.max(1, campaign.flightMonths || campaign.months);
  const amount = calculateFlightTotal(placementCount, flightMonths);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: amount,
          product_data: { name: `Potty Favor ad flight: ${campaign.name}` },
        },
        quantity: 1,
      },
    ],
    customer_email: campaign.advertiser.contactEmail,
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/portal/advertiser?stripe=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/portal/advertiser?stripe=cancel`,
    metadata: {
      campaignId: campaign.id,
      advertiserId: campaign.advertiserId,
      placementCount: String(placementCount),
      flightMonths: String(flightMonths),
      flightStartMonth: campaign.flightStartMonth,
      flightEndMonth: campaign.flightEndMonth,
    },
  });
  await prisma.payment.create({
    data: {
      campaignId: campaign.id,
      advertiserId: campaign.advertiserId,
      amountCents: amount,
      status: "PENDING",
      stripeSessionId: session.id,
    },
  });
  await prisma.adCampaign.update({
    where: { id: campaign.id },
    data: {
      status: "PAYMENT_PENDING",
      priceCents: amount,
      totalAmountCents: amount,
      placementCount,
      locationCount: placementCount,
      flightMonths,
      months: flightMonths,
      pricePerPlacementMonthCents: PRICE_PER_PLACEMENT_MONTH_CENTS,
      stripeSessionId: session.id,
    },
  });
  return request.headers.get("content-type")?.includes("application/json")
    ? NextResponse.json({ url: session.url })
    : NextResponse.redirect(
        session.url ||
          `${process.env.NEXT_PUBLIC_SITE_URL}/portal/advertiser?stripe=checkout-unavailable`,
        303,
      );
}
