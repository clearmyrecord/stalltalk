import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signature) return NextResponse.json({ received: false, error: "Stripe webhook signing is not configured." }, { status: 503 });
  const event = stripe.webhooks.constructEvent(payload, signature, secret);
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const campaignId = String(session.metadata?.campaignId || "");
    if (campaignId) {
      const campaign = await prisma.adCampaign.update({ where: { id: campaignId }, data: { status: "PAID", paidAt: new Date(), stripeSessionId: session.id }, include: { inventory: true } });
      await prisma.payment.updateMany({ where: { stripeSessionId: session.id }, data: { status: "SUCCEEDED", stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null } });
      if (campaign.inventoryId) await prisma.adSlotInventory.update({ where: { id: campaign.inventoryId }, data: { status: "SOLD" } });
      if (campaign.approvalStatus === "APPROVED" && campaign.inventory) await publishPaidCampaign(campaign.id);
    }
  }
  return NextResponse.json({ received: true, type: event.type });
}

async function publishPaidCampaign(campaignId: string) {
  const campaign = await prisma.adCampaign.findUnique({ where: { id: campaignId }, include: { inventory: true } });
  if (!campaign || campaign.status !== "PAID" || campaign.approvalStatus !== "APPROVED" || !campaign.inventory) return;
  const ad = await prisma.ad.create({ data: { publisherId: (await prisma.advertiser.findUniqueOrThrow({ where: { id: campaign.advertiserId } })).publisherId, advertiserId: campaign.advertiserId, businessName: campaign.businessName, title: campaign.headline, offer: campaign.body, artworkUrl: campaign.creativeUrl, ctaText: campaign.ctaText, targetUrl: campaign.targetUrl, status: "ACTIVE", scope: campaign.inventory.restroomId ? "RESTROOM" : "VENUE", venueId: campaign.inventory.venueId, restroomId: campaign.inventory.restroomId, monthlyPriceCents: 5000 } });
  await prisma.adCampaign.update({ where: { id: campaign.id }, data: { adId: ad.id, status: "ACTIVE", publishedAt: new Date() } });
}
