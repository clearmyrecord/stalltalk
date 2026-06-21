import { PasswordChangeForm } from "@/components/account/PasswordChangeForm";
import { requireAdmin } from "@/lib/auth";

export default async function AdminProfilePage() {
  const user = await requireAdmin();
  return <section className="mx-auto max-w-3xl"><div className="rounded-2xl border-4 border-ink bg-white p-6 shadow-brutal"><p className="font-black uppercase tracking-[.25em] text-stallRed">Admin</p><h1 className="font-display text-6xl uppercase">Profile</h1><p className="mt-2 font-bold">Signed in as {user.email}.</p></div><PasswordChangeForm /></section>;
}
