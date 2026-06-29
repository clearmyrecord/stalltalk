import Link from "next/link";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { signOutAction } from "@/lib/actions";
import { authEnvStatus, currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileOnboarding } from "@/components/portal/ProfileOnboarding";
import { EMPTY_ANALYTICS_MESSAGE, getAdvertiserAnalytics } from "@/lib/advertiser-analytics";

export const dynamic = "force-dynamic";

const allowedRoles: Role[] = ["ADVERTISER", "ADMIN"] as Role[];
const navItems = [
  ["Browse Inventory", "/portal/advertiser/inventory"],
  ["Create AI Ad", "/portal/advertiser/ad-studio"],
  ["Upload Finished Ad", "/portal/advertiser/upload"],
  ["Campaigns", "/portal/advertiser/campaigns"],
  ["Payments", "/portal/advertiser/payments"],
  ["Published Ads", "/portal/advertiser/published"],
  ["Profile", "/portal/advertiser/profile"],
  ["Analytics", "/portal/advertiser/analytics"],
] as const;

type PortalErrorDetail =
  | "missing advertiser profile"
  | "missing linked advertiser"
  | "database query failed"
  | "unauthorized role";

function AdvertiserPortalErrorCard({ detail }: { detail: PortalErrorDetail }) {
  return (
    <main className="min-h-screen bg-paper p-8 text-ink">
      <section className="mx-auto max-w-3xl rounded-2xl border-4 border-ink bg-white p-6 shadow-brutal">
        <p className="font-black uppercase tracking-[.25em] text-stallRed">
          Advertiser Portal
        </p>
        <h1 className="font-display text-5xl uppercase">
          Advertiser portal failed to load
        </h1>
        <p className="mt-4 rounded-xl bg-stallRed p-4 font-black uppercase text-white">
          {detail}
        </p>
        <p className="mt-3 font-bold">
          Please try refreshing the page. If this keeps happening, contact
          support and include the detail shown above.
        </p>
      </section>
    </main>
  );
}

function AdvertiserOnboarding() {
  return (
    <main className="min-h-screen bg-paper p-8 text-ink">
      <ProfileOnboarding
        title="Complete your advertiser profile"
        endpoint="/api/portal/advertiser/profile"
        button="Save Advertiser Profile"
        fields={[
          { name: "businessName", label: "Business name" },
          { name: "website", label: "Website", required: false },
          { name: "phone", label: "Phone", required: false },
          { name: "category", label: "Category", required: false },
        ]}
      />
    </main>
  );
}

export default async function AdvertiserPortalPage() {
  try {
    const auth = authEnvStatus();
    const user = await currentUser();

    if (auth.isConfigured && !user) redirect("/signin?error=admin_required");
    if (user && !allowedRoles.includes(user.role))
      return <AdvertiserPortalErrorCard detail="unauthorized role" />;

    const advertiser = user?.advertiserId
      ? await prisma.advertiser.findUnique({ where: { id: user.advertiserId } })
      : null;

    if (user?.role === "ADVERTISER" && !user.advertiserId)
      return <AdvertiserOnboarding />;
    if (user?.role === "ADVERTISER" && !advertiser)
      return <AdvertiserPortalErrorCard detail="missing linked advertiser" />;

    const [campaigns, invoices, analytics] = advertiser
      ? await Promise.all([
          prisma.adCampaign.count({ where: { advertiserId: advertiser.id } }),
          prisma.advertiserInvoice.count({
            where: { advertiserId: advertiser.id },
          }),
          getAdvertiserAnalytics(advertiser.id),
        ])
      : [0, 0, await getAdvertiserAnalytics(null)];

    return (
      <main className="min-h-screen bg-paper p-8 text-ink">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-black uppercase tracking-[.25em] text-stallRed">
              Advertiser Portal
            </p>
            <h1 className="font-display text-6xl uppercase">
              {advertiser?.name ?? "Advertiser Portal"}
            </h1>
            {!advertiser ? (
              <p className="mt-2 font-black uppercase text-stallPurple">
                Admin preview mode: no advertiser profile selected.
              </p>
            ) : null}
          </div>
          <form action={signOutAction}>
            <button className="rounded-xl bg-ink px-4 py-3 font-black uppercase text-white">
              Sign out
            </button>
          </form>
        </header>
        <section className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-4">
          {[
            ["Campaigns", campaigns],
            ["Payments", invoices],
            ["Published Ads", analytics.summary.publishedAds],
            ["Total Impressions", analytics.summary.totalImpressions],
            ["Total Clicks", analytics.summary.totalClicks],
            ["Average CTR", `${analytics.summary.averageCtr.toFixed(2)}%`],
            ["QR Attributed Views", analytics.summary.qrAttributedViews],
            ["Conversions", analytics.summary.conversions],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal"
            >
              <p className="font-black uppercase text-stallRed">{label}</p>
              <p className="font-display text-5xl uppercase">{value}</p>
            </div>
          ))}
        </section>
        {analytics.empty ? (
          <p className="mt-6 rounded-xl border-4 border-ink bg-stallYellow p-4 font-black uppercase">
            {EMPTY_ANALYTICS_MESSAGE}
          </p>
        ) : null}
        <nav className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {navItems.map(([item, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-2xl border-4 border-ink bg-stallYellow p-5 font-display text-3xl uppercase shadow-brutal"
            >
              {item}
            </Link>
          ))}
        </nav>
      </main>
    );
  } catch (error) {
    if (
      String((error as { digest?: string })?.digest || "").startsWith(
        "NEXT_REDIRECT",
      )
    )
      throw error;
    console.error("[advertiser-portal]", error);
    const message =
      error instanceof Error ? error.message : String(error || "");
    const detail: PortalErrorDetail = /advertiser/i.test(message)
      ? "missing advertiser profile"
      : "database query failed";
    return <AdvertiserPortalErrorCard detail={detail} />;
  }
}
