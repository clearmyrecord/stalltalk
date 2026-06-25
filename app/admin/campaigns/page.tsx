import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const targetTypes = ["sticker", "restroom", "venue", "zip", "city", "state", "default"] as const;

async function createCampaign(formData: FormData) {
  "use server";
  await prisma.pottyFavorCampaign.create({ data: readCampaignForm(formData) });
  revalidatePath("/admin/campaigns");
}

async function updateCampaign(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  await prisma.pottyFavorCampaign.update({ where: { id }, data: readCampaignForm(formData) });
  revalidatePath("/admin/campaigns");
}

async function toggleCampaign(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  const active = String(formData.get("active")) === "true";
  await prisma.pottyFavorCampaign.update({ where: { id }, data: { active: !active } });
  revalidatePath("/admin/campaigns");
}

function readCampaignForm(formData: FormData) {
  const start = String(formData.get("startDate") || "");
  const end = String(formData.get("endDate") || "");
  return {
    advertiserName: String(formData.get("advertiserName") || ""),
    campaignName: String(formData.get("campaignName") || ""),
    destinationUrl: String(formData.get("destinationUrl") || "/issue"),
    active: formData.get("active") === "on",
    startDate: start ? new Date(`${start}T00:00:00.000Z`) : null,
    endDate: end ? new Date(`${end}T23:59:59.999Z`) : null,
    targetType: formData.get("targetType") as any,
    targetValue: String(formData.get("targetValue") || "default")
  };
}

export default async function CampaignManagementPage() {
  const [campaigns, counts] = await Promise.all([
    prisma.pottyFavorCampaign.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.pottyFavorScanAnalytics.groupBy({ by: ["campaignId"], _count: { _all: true } })
  ]);
  const scanCountByCampaign = new Map(counts.map((count) => [count.campaignId, count._count._all]));

  return <section className="grid gap-6"><div><p className="font-black uppercase text-stallRed">Dynamic QR campaigns</p><h1 className="font-display text-6xl uppercase md:text-7xl">Campaigns</h1><p className="max-w-3xl font-bold">Create campaigns, assign target levels, activate/deactivate flights, preview destinations, and watch scan counts.</p></div>
    <section className="rounded-2xl border-4 border-ink bg-white p-4 shadow-brutal"><h2 className="font-display text-4xl uppercase">Create campaign</h2><CampaignForm action={createCampaign} submitLabel="Create campaign" /></section>
    <section className="grid gap-4">{campaigns.map(campaign => <article key={campaign.id} className="rounded-2xl border-4 border-ink bg-white p-4 shadow-brutal"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-display text-4xl uppercase">{campaign.campaignName}</h2><p className="font-black text-stallRed">{campaign.advertiserName} • {campaign.targetType}: {campaign.targetValue}</p></div><div className="text-right"><span className={`rounded-full px-3 py-1 text-xs font-black uppercase text-white ${campaign.active ? "bg-green-700" : "bg-stallRed"}`}>{campaign.active ? "Active" : "Inactive"}</span><p className="mt-2 font-black">{(scanCountByCampaign.get(campaign.id) || 0).toLocaleString()} scans</p></div></div><CampaignForm action={updateCampaign} submitLabel="Save edits" campaign={campaign}/><div className="mt-3 flex flex-wrap gap-2"><form action={toggleCampaign}><input type="hidden" name="id" value={campaign.id}/><input type="hidden" name="active" value={String(campaign.active)}/><button className="rounded bg-ink px-4 py-2 font-black uppercase text-white">{campaign.active ? "Deactivate" : "Activate"}</button></form><a className="rounded border-2 border-ink bg-stallYellow px-4 py-2 font-black uppercase" href={campaign.destinationUrl} target="_blank">Preview destination</a></div></article>)}</section>
  </section>;
}

function CampaignForm({ action, submitLabel, campaign }: { action: (formData: FormData) => Promise<void>; submitLabel: string; campaign?: any }) {
  return <form action={action} className="mt-4 grid gap-3 md:grid-cols-4"><input type="hidden" name="id" value={campaign?.id || ""}/><input name="advertiserName" required placeholder="Advertiser name" defaultValue={campaign?.advertiserName || ""} className="rounded border-2 border-ink p-3 font-bold"/><input name="campaignName" required placeholder="Campaign name" defaultValue={campaign?.campaignName || ""} className="rounded border-2 border-ink p-3 font-bold"/><input name="destinationUrl" required placeholder="https://example.com/offer" defaultValue={campaign?.destinationUrl || ""} className="rounded border-2 border-ink p-3 font-bold md:col-span-2"/><label className="flex items-center gap-2 rounded border-2 border-ink p-3 font-black uppercase"><input type="checkbox" name="active" defaultChecked={campaign?.active ?? true}/> Active</label><input type="date" name="startDate" defaultValue={campaign?.startDate?.toISOString().slice(0, 10) || ""} className="rounded border-2 border-ink p-3 font-bold"/><input type="date" name="endDate" defaultValue={campaign?.endDate?.toISOString().slice(0, 10) || ""} className="rounded border-2 border-ink p-3 font-bold"/><select name="targetType" defaultValue={campaign?.targetType || "zip"} className="rounded border-2 border-ink p-3 font-black uppercase">{targetTypes.map(type => <option key={type} value={type}>{type}</option>)}</select><input name="targetValue" required placeholder="89012, mgm-grand, PF-000001, default" defaultValue={campaign?.targetValue || ""} className="rounded border-2 border-ink p-3 font-bold"/><button className="rounded bg-stallRed p-3 font-black uppercase text-white md:col-span-4">{submitLabel}</button></form>;
}
