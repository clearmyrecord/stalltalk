import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder");

export function stripeEnvStatus() {
  return {
    hasSecretKey: Boolean(process.env.STRIPE_SECRET_KEY),
    hasWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    hasSiteUrl: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
    isConfigured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_SITE_URL)
  };
}

export const stripePrices = {
  GLOBAL: process.env.STRIPE_PRICE_GLOBAL,
  CITY: process.env.STRIPE_PRICE_CITY,
  VENUE: process.env.STRIPE_PRICE_VENUE,
  RESTROOM: process.env.STRIPE_PRICE_RESTROOM
};
