import { NextResponse } from "next/server";
import { stripe, stripePrices } from "@/lib/stripe";

export async function POST(request: Request) {
  const body = await request.json();
  const scope = String(body.scope || "GLOBAL") as keyof typeof stripePrices;
  const price = stripePrices[scope];
  if (!price) return NextResponse.json({ error: `Missing Stripe price for ${scope}` }, { status: 400 });
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: Number(body.locations || 1) }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/advertiser?stripe=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/advertiser?stripe=cancel`,
    metadata: { advertiserId: body.advertiserId || "", adId: body.adId || "", scope }
  });
  return NextResponse.json({ url: session.url });
}
