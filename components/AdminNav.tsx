import Link from "next/link";
import { signOutAction } from "@/lib/actions";

const links = [
  ["/admin/dashboard", "Dashboard"],
  ["/admin/publishers", "Publishers"],
  ["/admin/distributors", "Distributors"],
  ["/admin/advertisers", "Advertisers"],
  ["/admin/venues", "Venues"],
  ["/admin/qr", "QR Inventory"],
  ["/admin/articles", "Articles"],
  ["/admin/issues", "Issues"],
  ["/admin/issue-builder", "Issue Builder"],
  ["/admin/ads", "Ads"],
  ["/admin/ad-studio", "Ad Studio"],
  ["/admin/health", "Health"],
  ["/admin/settings", "Settings"],
  ["/admin/deployment-checklist", "Deployment"],
  ["/admin/analytics", "Analytics"],
  ["/admin/stripe", "Stripe"],
  ["/portal/advertiser", "Advertiser Portal"],
  ["/portal/venue", "Venue Portal"]
];

export function AdminNav() {
  return <nav className="flex flex-wrap items-center gap-2 border-b-4 border-ink bg-stallYellow p-3">{links.map(([href, label]) => <Link key={href} className="rounded-lg border-2 border-ink bg-white px-3 py-2 text-sm font-black uppercase" href={href}>{label}</Link>)}<form action={signOutAction} className="ml-auto"><button className="rounded-lg border-2 border-ink bg-stallRed px-3 py-2 text-sm font-black uppercase text-white">Logout</button></form></nav>;
}
