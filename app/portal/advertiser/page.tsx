import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/lib/actions";
import { authEnvStatus, currentUser, dashboardForRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileOnboarding } from "@/components/portal/ProfileOnboarding";

export const dynamic = "force-dynamic";

function ErrorCard({ message }: { message: string }) {
  return <main className="min-h-screen bg-paper p-8 text-ink"><div className="rounded-2xl border-4 border-ink bg-stallRed p-5 font-black text-white shadow-brutal">{message}</div></main>;
}

export default async function AdvertiserPortalPage() {
  const auth = authEnvStatus();
  const user = await currentUser();
  if (auth.isConfigured && !user) redirect("/signin?error=admin_required");
  if (user && user.role !== "ADVERTISER" && user.role !== "ADMIN") return <WrongPortal role={user.role} />;

  try {
    const advertiser = user?.advertiserId ? await prisma.advertiser.findUnique({ where: { id: user.advertiserId } }) : null;
    if (user?.role === "ADVERTISER" && !advertiser) {
      return <main className="min-h-screen bg-paper p-8 text-ink"><ProfileOnboarding title="Complete your advertiser profile" endpoint="/api/portal/advertiser/profile" button="Save Advertiser Profile" fields={[{ name: "businessName", label: "Business name" }, { name: "website", label: "Website", required: false }, { name: "phone", label: "Phone", required: false }, { name: "category", label: "Category", required: false }]} /></main>;
    }
    const [campaigns, invoices, ads] = advertiser ? await Promise.all([
      prisma.adCampaign.count({ where: { advertiserId: advertiser.id } }),
      prisma.advertiserInvoice.count({ where: { advertiserId: advertiser.id } }),
      prisma.ad.count({ where: { advertiserId: advertiser.id, status: "ACTIVE" } })
    ]) : [0, 0, 0];
    return <main className="min-h-screen bg-paper p-8 text-ink"><header className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black uppercase tracking-[.25em] text-stallRed">Advertiser Portal</p><h1 className="font-display text-6xl uppercase">{advertiser?.name || "Advertiser Dashboard"}</h1></div><form action={signOutAction}><button className="rounded-xl bg-ink px-4 py-3 font-black uppercase text-white">Sign out</button></form></header><section className="mt-6 grid gap-4 md:grid-cols-3">{[["Campaigns", campaigns], ["Payments", invoices], ["Published Ads", ads]].map(([label, value]) => <div key={label} className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal"><p className="font-black uppercase text-stallRed">{label}</p><p className="font-display text-5xl uppercase">{value}</p></div>)}</section><nav className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{["Create AI Ad", "Upload Finished Ad", "Campaigns", "Payments", "Published Ads", "Account Profile"].map((item) => <Link key={item} href="#" className="rounded-2xl border-4 border-ink bg-stallYellow p-5 font-display text-3xl uppercase shadow-brutal">{item}</Link>)}</nav></main>;
  } catch (error) {
    return <ErrorCard message={error instanceof Error ? error.message : "Unable to load advertiser portal."} />;
  }
}

function WrongPortal({ role }: { role: any }) {
  const dashboard = dashboardForRole(role);
  return <main className="min-h-screen bg-paper p-8 text-ink"><section className="rounded-2xl border-4 border-ink bg-white p-6 shadow-brutal"><h1 className="font-display text-5xl uppercase">Wrong dashboard</h1><p className="mt-3 font-black">That account cannot access the advertiser dashboard.</p><Link href={dashboard} className="mt-4 inline-block rounded-xl bg-ink px-4 py-3 font-black uppercase text-white">Go to your dashboard</Link></section></main>;
}
