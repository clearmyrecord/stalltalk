import Link from "next/link";
import ForgotPasswordForm from "./reset-request-form";

export default function ForgotPasswordPage() {
  return <main className="min-h-screen bg-paper p-6 text-ink"><section className="mx-auto max-w-xl rounded-2xl border-4 border-ink bg-white p-6 shadow-brutal"><p className="font-black uppercase tracking-[.25em] text-stallRed">Account recovery</p><h1 className="font-display text-6xl uppercase">Forgot Password</h1><p className="mt-2 font-bold">Enter your email and we&apos;ll send reset instructions if an account exists.</p><ForgotPasswordForm /><Link href="/signin" className="mt-4 inline-block font-black uppercase text-stallRed underline">Back to sign in</Link></section></main>;
}
