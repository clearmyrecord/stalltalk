import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe, stripeEnvStatus } from "@/lib/stripe";
import { calculateFlightTotal, PRICE_PER_PLACEMENT_MONTH_CENTS } from "@/lib/campaign-flights";

async function parseCampaignId(request: Request) {
  const type = request.headers.get("content-type") || "";
  if (type.includes("application/json")) return String((await request.json()).campaignId || "");
  const form = await request.formData();
  return String(form.get("campaignId") || "");
}

export async function POST(request: Request) {
  const campaignId = await parseCampaignId(request);
  const stripeStatus = stripeEnvStatus();
  if (!stripeStatus.isConfigured) return NextResponse.json({ error: "Stripe is not configured. Set STRIPE_SECRET_KEY and NEXT_PUBLIC_SITE_URL to enable checkout." }, { status: 503 });
  const campaign = await prisma.adCampaign.findUnique({ where: { id: campaignId }, include: { advertiser: true, placements: true } });
  if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  const placementCount = Math.max(1, campaign.placements.length || campaign.placementCount || campaign.locationCount);
  const flightMonths = Math.max(1, campaign.flightMonths || campaign.months);
  const amount = calculateFlightTotal(placementCount, flightMonths);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price_data: { currency: "usd", unit_amount: amount, product_data: { name: `Potty Favor ad flight: ${campaign.name}` } }, quantity: 1 }],
    customer_email: campaign.advertiser.contactEmail,
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/portal/advertiser?stripe=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/portal/advertiser?stripe=cancel`,
    metadata: {
      campaignId: campaign.id,
      advertiserId: campaign.advertiserId,
      placementCount: String(placementCount),
      flightMonths: String(flightMonths),
      flightStartMonth: campaign.flightStartMonth,
      flightEndMonth: campaign.flightEndMonth
    }
  });
  await prisma.payment.create({ data: { campaignId: campaign.id, advertiserId: campaign.advertiserId, amountCents: amount, status: "PENDING", stripeSessionId: session.id } });
  await prisma.adCampaign.update({ where: { id: campaign.id }, data: { status: "PAYMENT_PENDING", priceCents: amount, totalAmountCents: amount, placementCount, locationCount: placementCount, flightMonths, months: flightMonths, pricePerPlacementMonthCents: PRICE_PER_PLACEMENT_MONTH_CENTS, stripeSessionId: session.id } });
  if (request.headers.get("content-type")?.includes("application/json")) return NextResponse.json({ url: session.url });
  return NextResponse.redirect(session.url || `${process.env.NEXT_PUBLIC_SITE_URL}/portal/advertiser?stripe=checkout-unavailable`, 303);
}
