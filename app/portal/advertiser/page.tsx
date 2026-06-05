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
  isMissingDatabase: boolean;
};

function isMissingTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message) : "";

  return code === "P2021" || /(?:table|relation).*does not exist|public\.Advertiser|public\.AnalyticsEvent/i.test(message);
}

async function getAdvertiserPortalData(): Promise<AdvertiserPortalData> {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return { advertisers: [], events: [], isMissingDatabase: false };
  }

  try {
    const [advertisers, events] = await Promise.all([
      prisma.advertiser.findMany({ include: { ads: true, subscriptions: true } }),
      prisma.analyticsEvent.findMany({ where: { adId: { not: null } } })
    ]);

    return { advertisers, events, isMissingDatabase: false };
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
    console.warn("Advertiser portal tables are missing; rendering empty advertiser portal state instead.", error);
    return { advertisers: [], events: [], isMissingDatabase: true };
  }
}

function AdvertiserEmptyState({ message }: { message: string }) {
  return (
    <div className="mt-6 rounded-2xl border-4 border-dashed border-ink bg-white p-8 text-center shadow-brutal">
      <h2 className="font-display text-5xl uppercase">No advertiser data</h2>
      <p className="mt-2 font-bold text-stallPurple">{message}</p>
    </div>
  );
}

export default async function AdvertiserPortalPage() {
  const { advertisers, events, isMissingDatabase } = await getAdvertiserPortalData();

  return (
    <main className="min-h-screen bg-paper p-4 text-ink md:p-8">
      <h1 className="font-display text-7xl uppercase">Advertiser Portal</h1>
      <p className="font-bold">Advertisers can upload artwork, update coupons, and see analytics for their campaigns.</p>
      {isMissingDatabase ? (
        <AdvertiserEmptyState message="Advertiser tables are not available yet. Run Prisma migrations to enable live campaign updates." />
      ) : null}
      {!isMissingDatabase && advertisers.length === 0 ? (
        <AdvertiserEmptyState message="No advertisers have been created yet." />
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
                  <form key={ad.id} action={updateAd.bind(null, ad.id)} className="grid gap-2 rounded-xl border-2 border-ink p-3">
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
                    <input name="businessName" defaultValue={ad.businessName} className="rounded border-2 border-ink p-2 font-black" />
                    <input name="title" defaultValue={ad.title} className="rounded border-2 border-ink p-2" />
                    <textarea name="offer" defaultValue={ad.offer} className="rounded border-2 border-ink p-2" />
                    <input name="artworkUrl" defaultValue={ad.artworkUrl || ""} placeholder="Upload/paste artwork URL" className="rounded border-2 border-ink p-2" />
                    <input name="couponCode" defaultValue={ad.couponCode || ""} placeholder="Coupon" className="rounded border-2 border-ink p-2" />
                    <input name="ctaText" defaultValue={ad.ctaText} className="rounded border-2 border-ink p-2" />
                    <input name="targetUrl" defaultValue={ad.targetUrl} className="rounded border-2 border-ink p-2" />
                    <input name="phone" defaultValue={ad.phone || ""} className="rounded border-2 border-ink p-2" />
                    <button className="rounded bg-ink p-2 font-black uppercase text-white">
                      Update creative
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
