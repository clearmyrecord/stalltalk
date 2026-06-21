import Link from "next/link";
import ResetPasswordForm from "./reset-password-form";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;
  return <main className="min-h-screen bg-paper p-6 text-ink"><section className="mx-auto max-w-xl rounded-2xl border-4 border-ink bg-white p-6 shadow-brutal"><p className="font-black uppercase tracking-[.25em] text-stallRed">Account recovery</p><h1 className="font-display text-6xl uppercase">Reset Password</h1>{params.token ? <ResetPasswordForm token={params.token} /> : <p className="mt-4 rounded-xl bg-stallRed p-3 font-black text-white">Reset link is invalid or expired.</p>}<Link href="/signin" className="mt-4 inline-block font-black uppercase text-stallRed underline">Back to sign in</Link></section></main>;
}
