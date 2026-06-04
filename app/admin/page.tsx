import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboard() {
  const [publishers, distributors, advertisers, venues, restrooms, qrCodes, issues, ads, scans, visitors] = await Promise.all([
    prisma.publisher.count(), prisma.distributor.count(), prisma.advertiser.count(), prisma.venue.count(), prisma.restroom.count(), prisma.qrCode.count(), prisma.issue.count(), prisma.ad.count(),
    prisma.analyticsEvent.count({ where: { type: "SCAN" } }),
    prisma.analyticsEvent.groupBy({ by: ["visitorId"], where: { visitorId: { not: null } } })
  ]);
  const cards = [["Publishers", publishers], ["Distributors", distributors], ["Advertisers", advertisers], ["Venues", venues], ["Restrooms", restrooms], ["QR Codes", qrCodes], ["Issues", issues], ["Ads", ads], ["Scans", scans], ["Unique Visitors", visitors.length]];
  return <section><p className="font-black uppercase tracking-[.25em] text-stallRed">SaaS control center</p><h1 className="font-display text-7xl uppercase">Publisher Platform</h1><p className="max-w-4xl font-bold">Manage the hierarchy Publisher → Distributor → Venue → Restroom → QR Code → Issue, with ad serving, portals, Stripe readiness, and analytics for production deployment.</p><div className="mt-6 grid gap-4 md:grid-cols-5">{cards.map(([label, value]) => <div key={label} className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal"><p className="font-black uppercase text-stallRed">{label}</p><p className="font-display text-5xl">{value}</p></div>)}</div><div className="mt-8 flex flex-wrap gap-3"><Link className="rounded-xl bg-ink px-5 py-3 font-black uppercase text-white" href="/admin/qr">Generate QR</Link><Link className="rounded-xl bg-stallRed px-5 py-3 font-black uppercase text-white" href="/admin/issue-builder">Open Builder</Link><Link className="rounded-xl bg-stallPurple px-5 py-3 font-black uppercase text-white" href="/admin/stripe">Stripe Plans</Link></div></section>;
}
