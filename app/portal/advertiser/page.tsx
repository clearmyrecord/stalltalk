import { updateAd } from "@/lib/actions";
import { money, percent } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PortalAd = {
  id: string;
  publisherId: string;
  advertiserId: string;
  businessName: string;
  title: string;
  offer: string;
  artworkUrl: string | null;
  couponCode: string | null;
  ctaText: string;
  targetUrl: string;
  phone: string | null;
  status: string;
  scope: string;
  city: string | null;
  state: string | null;
  venueId: string | null;
  restroomId: string | null;
  monthlyPriceCents: number;
  stripePriceId: string | null;
};

type PortalAdvertiser = {
  id: string;
  contactEmail: string;
  name: string;
  ads: PortalAd[];
  subscriptions: { id: string }[];
};

type PortalEvent = {
  advertiserId: string | null;
  type: string;
};

type AdvertiserPortalData = {
  advertisers: PortalAdvertiser[];
  events: PortalEvent[];
  isDemo: boolean;
};

const demoAdvertisers: PortalAdvertiser[] = [
  {
    id: "demo-advertiser-1",
    contactEmail: "marketing@neonburrito.example",
    name: "Neon Burrito",
    subscriptions: [{ id: "demo-subscription-global" }],
    ads: [
      {
        id: "demo-ad-1",
        publisherId: "demo-publisher",
        advertiserId: "demo-advertiser-1",
        businessName: "Neon Burrito",
        title: "Late-night tacos near the strip",
        offer: "Show this screen for 15% off after 9 PM.",
        artworkUrl: "",
        couponCode: "STALL15",
        ctaText: "Claim the coupon",
        targetUrl: "https://example.com/neon-burrito",
        phone: "702-555-0188",
        status: "ACTIVE",
        scope: "CITY",
        city: "Las Vegas",
        state: "NV",
        venueId: null,
        restroomId: null,
        monthlyPriceCents: 29900,
        stripePriceId: "price_demo_city"
      }
    ]
  },
  {
    id: "demo-advertiser-2",
    contactEmail: "ads@jackpotrides.example",
    name: "Jackpot Rideshare Lounge",
    subscriptions: [{ id: "demo-subscription-venue" }, { id: "demo-subscription-restroom" }],
    ads: [
      {
        id: "demo-ad-2",
        publisherId: "demo-publisher",
        advertiserId: "demo-advertiser-2",
        businessName: "Jackpot Rideshare Lounge",
        title: "Skip the curb chaos",
        offer: "Free bottled water with every pickup reservation.",
        artworkUrl: "",
        couponCode: "COOLRIDE",
        ctaText: "Book pickup",
        targetUrl: "https://example.com/jackpot-rideshare",
        phone: "702-555-0144",
        status: "ACTIVE",
        scope: "VENUE",
        city: null,
        state: null,
        venueId: "demo-venue",
        restroomId: null,
        monthlyPriceCents: 49900,
        stripePriceId: "price_demo_venue"
      }
    ]
  }
];

const demoEvents: PortalEvent[] = [
  ...Array.from({ length: 34 }, () => ({ advertiserId: "demo-advertiser-1", type: "AD_CLICK" })),
  ...Array.from({ length: 9 }, () => ({ advertiserId: "demo-advertiser-1", type: "COUPON_REDEMPTION" })),
  ...Array.from({ length: 48 }, () => ({ advertiserId: "demo-advertiser-2", type: "AD_CLICK" })),
  ...Array.from({ length: 13 }, () => ({ advertiserId: "demo-advertiser-2", type: "COUPON_REDEMPTION" }))
];

function isMissingTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message) : "";

  return code === "P2021" || /(?:table|relation).*does not exist|public\.Advertiser|public\.AnalyticsEvent/i.test(message);
}

async function getAdvertiserPortalData(): Promise<AdvertiserPortalData> {
  try {
    const [advertisers, events] = await Promise.all([
      prisma.advertiser.findMany({ include: { ads: true, subscriptions: true } }),
      prisma.analyticsEvent.findMany({ where: { adId: { not: null } } })
    ]);

    return { advertisers, events, isDemo: false };
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
    console.warn("Advertiser portal tables are missing; rendering demo portal data instead.", error);
    return { advertisers: demoAdvertisers, events: demoEvents, isDemo: true };
  }
}

export default async function AdvertiserPortalPage() {
  const { advertisers, events, isDemo } = await getAdvertiserPortalData();

  return (
    <main className="min-h-screen bg-paper p-4 text-ink md:p-8">
      <h1 className="font-display text-7xl uppercase">Advertiser Portal</h1>
      <p className="font-bold">Advertisers can upload artwork, update coupons, and see analytics for their campaigns.</p>
      {isDemo ? (
        <div className="mt-4 rounded-2xl border-4 border-stallRed bg-white p-4 font-bold shadow-red">
          Database tables are not available yet, so this page is showing demo advertiser portal data. Run Prisma migrations before
          production builds to enable live campaign updates.
        </div>
      ) : null}
      <div className="mt-6 grid gap-6">
        {advertisers.map((advertiser) => {
          const clicks = events.filter((event) => event.advertiserId === advertiser.id && event.type === "AD_CLICK").length;
          const redemptions = events.filter((event) => event.advertiserId === advertiser.id && event.type === "COUPON_REDEMPTION").length;

          return (
            <section key={advertiser.id} className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal">
              <p className="text-xs font-black uppercase text-stallRed">{advertiser.contactEmail}</p>
              <h2 className="font-display text-5xl uppercase">{advertiser.name}</h2>
              <div className="my-4 grid gap-3 md:grid-cols-4">
                {[
                  ["Ad clicks", clicks],
                  ["Coupon redemptions", redemptions],
                  ["Subscriptions", advertiser.subscriptions.length],
                  ["Blended CTR", percent(clicks ? clicks / Math.max(clicks + 10, 1) : 0)]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border-2 border-ink bg-paper p-3">
                    <p className="font-black uppercase text-stallRed">{label}</p>
                    <p className="font-display text-3xl">{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {advertiser.ads.map((ad) => (
                  <form key={ad.id} action={isDemo ? undefined : updateAd.bind(null, ad.id)} className="grid gap-2 rounded-xl border-2 border-ink p-3">
                    <input type="hidden" name="publisherId" value={ad.publisherId} />
                    <input type="hidden" name="advertiserId" value={ad.advertiserId} />
                    <input type="hidden" name="scope" value={ad.scope} />
                    <input type="hidden" name="city" value={ad.city || ""} />
                    <input type="hidden" name="state" value={ad.state || ""} />
                    <input type="hidden" name="venueId" value={ad.venueId || ""} />
                    <input type="hidden" name="restroomId" value={ad.restroomId || ""} />
                    <input type="hidden" name="status" value={ad.status} />
                    <input type="hidden" name="monthlyPriceDollars" value={Math.round(ad.monthlyPriceCents / 100)} />
                    <input type="hidden" name="stripePriceId" value={ad.stripePriceId || ""} />
                    <input name="businessName" defaultValue={ad.businessName} className="rounded border-2 border-ink p-2 font-black" readOnly={isDemo} />
                    <input name="title" defaultValue={ad.title} className="rounded border-2 border-ink p-2" readOnly={isDemo} />
                    <textarea name="offer" defaultValue={ad.offer} className="rounded border-2 border-ink p-2" readOnly={isDemo} />
                    <input name="artworkUrl" defaultValue={ad.artworkUrl || ""} placeholder="Upload/paste artwork URL" className="rounded border-2 border-ink p-2" readOnly={isDemo} />
                    <input name="couponCode" defaultValue={ad.couponCode || ""} placeholder="Coupon" className="rounded border-2 border-ink p-2" readOnly={isDemo} />
                    <input name="ctaText" defaultValue={ad.ctaText} className="rounded border-2 border-ink p-2" readOnly={isDemo} />
                    <input name="targetUrl" defaultValue={ad.targetUrl} className="rounded border-2 border-ink p-2" readOnly={isDemo} />
                    <input name="phone" defaultValue={ad.phone || ""} className="rounded border-2 border-ink p-2" readOnly={isDemo} />
                    <button disabled={isDemo} className="rounded bg-ink p-2 font-black uppercase text-white disabled:cursor-not-allowed disabled:bg-stallPurple">
                      {isDemo ? "Demo creative" : "Update creative"}
                    </button>
                    <p className="text-xs font-black uppercase text-stallPurple">
                      {ad.scope} • {money(ad.monthlyPriceCents)}/mo
                    </p>
                  </form>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
