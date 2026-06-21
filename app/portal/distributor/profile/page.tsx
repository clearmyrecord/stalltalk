import Link from "next/link";
import { PasswordChangeForm } from "@/components/account/PasswordChangeForm";
import { requireRole } from "@/lib/auth";

export default async function DistributorProfilePage() {
  const user = await requireRole(["DISTRIBUTOR", "ADMIN"]);
  return <main className="min-h-screen bg-paper p-8 text-ink"><section className="mx-auto max-w-3xl rounded-2xl border-4 border-ink bg-white p-6 shadow-brutal"><p className="font-black uppercase tracking-[.25em] text-stallRed">Distributor Portal</p><h1 className="font-display text-6xl uppercase">Profile</h1><p className="mt-2 font-bold">Signed in as {user.email}.</p><Link href="/portal/distributor" className="mt-4 inline-flex font-black uppercase text-stallPurple underline">Back to Distributor Portal</Link></section><PasswordChangeForm /></main>;
}
