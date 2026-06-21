import Link from "next/link";
import { submitFinishedAdvertiserAd } from "@/lib/actions";
import { advertiserForPortalUser, requireAdvertiserPortalUser } from "@/lib/advertiser-portal";

export const dynamic = "force-dynamic";

export default async function AdvertiserUploadPage() {
  const user = await requireAdvertiserPortalUser();
  const advertiser = await advertiserForPortalUser(user);
  return <main className="min-h-screen bg-paper p-8 text-ink"><section className="mx-auto max-w-3xl rounded-2xl border-4 border-ink bg-white p-6 shadow-brutal"><p className="font-black uppercase tracking-[.25em] text-stallRed">Advertiser Portal</p><h1 className="font-display text-6xl uppercase">Upload Finished Ad</h1><p className="mt-2 font-bold">Submit a finished 3:1 ad image for review and publishing.</p><Link href="/portal/advertiser" className="mt-4 inline-flex font-black uppercase text-stallPurple underline">Back to Advertiser Portal</Link><form action={submitFinishedAdvertiserAd} className="mt-6 grid gap-4"><input type="hidden" name="advertiserId" value={advertiser?.id || ""} /><label className="grid gap-1 font-black uppercase">Business name<input name="businessName" required defaultValue={advertiser?.name || ""} className="rounded border-2 border-ink p-3" /></label><label className="grid gap-1 font-black uppercase">Target URL<input name="targetUrl" type="url" required placeholder="https://example.com" className="rounded border-2 border-ink p-3" /></label><label className="grid gap-1 font-black uppercase">Upload finished 3:1 ad image<input name="creativeImage" type="file" accept="image/*" required className="rounded border-2 border-ink bg-white p-3" /></label><button className="rounded-xl bg-ink px-5 py-3 font-black uppercase text-white">Submit for review/publishing</button></form></section></main>;
}
