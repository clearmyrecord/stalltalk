import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const event = secret && signature ? stripe.webhooks.constructEvent(payload, signature, secret) : JSON.parse(payload);
  return NextResponse.json({ received: true, type: event.type });
}
