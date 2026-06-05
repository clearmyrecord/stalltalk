import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const plans = [["Global", 19900, "Network-wide remnant and brand awareness"], ["City", 29900, "Target a single metro"], ["Venue", 49900, "Own premium venue inventory"], ["Restroom", 69900, "Highest-priority restroom-level sponsorship"]] as const;

export default async function StripePage() {
  const subscriptions = await prisma.stripeSubscription.findMany({ include: { advertiser: true, ad: true } });
  const campaigns = await prisma.couponCampaign.findMany();
  return <section><h1 className="font-display text-7xl uppercase">Stripe Billing</h1><p className="font-bold">Prepared for monthly ad subscriptions, per-location pricing, and coupon campaign billing on Vercel.</p><div className="mt-6 grid gap-4 md:grid-cols-4">{plans.map(([name, cents, desc]) => <article key={name} className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal"><p className="font-black uppercase text-stallRed">{name}</p><h2 className="font-display text-5xl uppercase">{money(cents)}</h2><p className="font-bold">{desc}</p><p className="mt-3 rounded bg-paper p-2 text-xs font-black">Env price: STRIPE_PRICE_{name.toUpperCase()}</p></article>)}</div><div className="mt-8 grid gap-6 md:grid-cols-2"><section className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal"><h2 className="font-display text-4xl uppercase">Subscriptions</h2>{subscriptions.map((sub) => <p key={sub.id} className="mt-2 rounded bg-paper p-3 font-black">{sub.advertiser.name} • {sub.status} • {money(sub.monthlyAmountCents)} • {sub.locations} locations</p>)}</section><section className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal"><h2 className="font-display text-4xl uppercase">Coupon Campaigns</h2>{campaigns.map((campaign) => <p key={campaign.id} className="mt-2 rounded bg-paper p-3 font-black">{campaign.name} • {campaign.couponCode} • {money(campaign.budgetCents)} budget</p>)}</section></div></section>;
}
