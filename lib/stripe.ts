import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder");

export const stripePrices = {
  GLOBAL: process.env.STRIPE_PRICE_GLOBAL,
  CITY: process.env.STRIPE_PRICE_CITY,
  VENUE: process.env.STRIPE_PRICE_VENUE,
  RESTROOM: process.env.STRIPE_PRICE_RESTROOM
};
