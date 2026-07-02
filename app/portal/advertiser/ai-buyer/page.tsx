import Link from "next/link";
import { AdvertiserProfileRequired, advertiserForPortalUser, requireAdvertiserPortalUser } from "@/lib/advertiser-portal";
import { AiBuyerClient } from "./AiBuyerClient";

export const dynamic = "force-dynamic";

export default async function AiBuyerPage() {
  const user = await requireAdvertiserPortalUser();
  const advertiser = await advertiserForPortalUser(user);
  if (!advertiser) return <AdvertiserProfileRequired message="Complete your advertiser profile before using the AI Media Buyer." />;
  return <main className="min-h-screen bg-paper p-6 text-ink md:p-8"><header className="mx-auto mb-6 max-w-6xl"><p className="font-black uppercase tracking-[.25em] text-stallRed">Potty Favor advertiser flow</p><h1 className="font-display text-6xl uppercase md:text-8xl">AI Media Buyer</h1><p className="mt-2 max-w-3xl font-bold">Describe your business, choose an AI-generated ad, buy open permanent QR route sponsor slots, and publish automatically after Stripe payment.</p><Link href="/portal/advertiser" className="mt-3 inline-flex font-black uppercase text-stallPurple underline">Back to Advertiser Portal</Link></header><section className="mx-auto max-w-6xl"><AiBuyerClient advertiserName={advertiser.name} /></section></main>;
}
