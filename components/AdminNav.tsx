import Link from "next/link";

const links = [
  ["/admin", "Dashboard"],
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
  ["/portal/distributor", "Distributor Portal"]
];

export function AdminNav() {
  return <nav className="flex flex-wrap gap-2 border-b-4 border-ink bg-stallYellow p-3">{links.map(([href, label]) => <Link key={href} className="rounded-lg border-2 border-ink bg-white px-3 py-2 text-sm font-black uppercase" href={href}>{label}</Link>)}</nav>;
}
