import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const fmt = (date?: Date | null) => date ? date.toLocaleDateString() : "—";

export default async function QrAssetsPage() {
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1); startOfMonth.setUTCHours(0, 0, 0, 0);
  const [assets, totalAssets, scansThisMonth, topZips, topVenues, campaigns] = await Promise.all([
    prisma.pottyFavorQrAsset.findMany({ orderBy: [{ venueName: "asc" }, { qrId: "asc" }], take: 250 }),
    prisma.pottyFavorQrAsset.count(),
    prisma.pottyFavorScanAnalytics.count({ where: { timestamp: { gte: startOfMonth } } }),
    prisma.pottyFavorScanAnalytics.groupBy({ by: ["zip"], _count: { _all: true }, orderBy: { _count: { zip: "desc" } }, take: 5 }),
    prisma.pottyFavorScanAnalytics.groupBy({ by: ["venueSlug"], _count: { _all: true }, orderBy: { _count: { venueSlug: "desc" } }, take: 5 }),
    prisma.pottyFavorCampaign.findMany({ orderBy: { campaignName: "asc" } })
  ]);
  const campaignById = new Map(campaigns.map((campaign) => [campaign.id, campaign]));

  return <section className="grid gap-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-black uppercase text-stallRed">Potty Favor QR routing</p><h1 className="font-display text-6xl uppercase md:text-7xl">QR Assets</h1><p className="max-w-3xl font-bold">Manage the Country → State → City → ZIP Code → Venue → Restroom → Sticker hierarchy used by dynamic QR ad routing.</p></div><Link className="rounded-xl border-4 border-ink bg-stallYellow px-5 py-3 font-black uppercase shadow-brutal" href="/admin/campaigns">Manage campaigns</Link></div>
    <div className="grid gap-4 md:grid-cols-3"><Kpi label="Total QR assets" value={totalAssets}/><Kpi label="Scans this month" value={scansThisMonth}/><Kpi label="Active campaigns" value={campaigns.filter(c => c.active).length}/></div>
    <div className="grid gap-4 lg:grid-cols-2"><Rank title="Top ZIP codes" rows={topZips.map(z => [z.zip, z._count._all])}/><Rank title="Top venues" rows={topVenues.map(v => [v.venueSlug, v._count._all])}/></div>
    <section className="overflow-hidden rounded-2xl border-4 border-ink bg-white shadow-brutal"><h2 className="bg-ink p-4 font-display text-4xl uppercase text-white">QR asset table</h2><div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-sm"><thead><tr>{["QR ID","Hierarchy","Venue","Restroom","Sticker","Campaign assigned","Status","Installed"].map(h => <th key={h} className="border-b-4 border-ink bg-stallYellow p-3 font-black uppercase">{h}</th>)}</tr></thead><tbody>{assets.map(asset => <tr key={asset.id} className="odd:bg-paper"><td className="p-3 font-black"><Link className="underline" href={`/q/${asset.qrId}`}>{asset.qrId}</Link></td><td className="p-3 font-bold">{asset.country} › {asset.state} › {asset.city} › {asset.zip}</td><td className="p-3 font-bold">{asset.venueName}<br/><span className="text-xs uppercase text-stallRed">{asset.venueSlug}</span></td><td className="p-3 font-bold">{asset.restroomName}<br/><span className="text-xs uppercase">{asset.restroomType}</span></td><td className="p-3 font-bold">{asset.stickerLocation}</td><td className="p-3 font-bold">{asset.currentCampaignId ? campaignById.get(asset.currentCampaignId)?.campaignName || asset.currentCampaignId : "Resolved on scan"}</td><td className="p-3"><span className="rounded-full bg-ink px-3 py-1 text-xs font-black uppercase text-white">{asset.status}</span></td><td className="p-3 font-bold">{fmt(asset.installedAt)}</td></tr>)}</tbody></table></div></section>
  </section>;
}

function Kpi({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal"><p className="text-xs font-black uppercase text-stallRed">{label}</p><p className="font-display text-5xl uppercase">{value.toLocaleString()}</p></div>; }
function Rank({ title, rows }: { title: string; rows: [string, number][] }) { return <section className="rounded-2xl border-4 border-ink bg-white p-4 shadow-brutal"><h2 className="font-display text-4xl uppercase">{title}</h2>{rows.length ? <ol className="mt-3 grid gap-2">{rows.map(([label, count]) => <li key={label} className="flex justify-between rounded-xl border-2 border-ink bg-paper p-3 font-black"><span>{label}</span><span>{count.toLocaleString()}</span></li>)}</ol> : <p className="mt-3 font-bold">No scans yet.</p>}</section>; }
