import Link from "next/link";
import { signIn } from "@/lib/auth";

export default async function LoginPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const hasError = params?.error === "invalid";

  return (
    <main className="min-h-screen bg-ink px-5 py-12 text-white md:px-12">
      <section className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
        <div>
          <p className="mb-4 inline-flex rounded-full bg-stallYellow px-4 py-2 text-sm font-black uppercase tracking-[.25em] text-ink">Secure Stall Talk access</p>
          <h1 className="font-display text-7xl uppercase leading-[.78] text-stallYellow md:text-9xl">Account Login</h1>
          <p className="mt-5 max-w-2xl text-2xl font-black uppercase">Choose the right workspace after sign in: admin command center, advertiser creative portal, or venue operations portal.</p>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {["Admin", "Advertiser", "Venue"].map((role) => (
              <div key={role} className="rounded-2xl border-4 border-white bg-paper p-4 text-ink shadow-brutal">
                <h2 className="font-display text-4xl uppercase">{role}</h2>
                <p className="text-sm font-bold">Role-based access keeps campaigns, venues, and system tools separated.</p>
              </div>
            ))}
          </div>
        </div>
        <form action={signIn} className="rounded-[2rem] border-8 border-white bg-paper p-6 text-ink shadow-purple">
          <h2 className="font-display text-6xl uppercase text-stallRed">Sign in</h2>
          <p className="mb-4 font-bold">Use a seeded account or an account created by an administrator.</p>
          {hasError ? <p className="mb-4 rounded-xl border-2 border-stallRed bg-red-50 p-3 font-black uppercase text-stallRed">Invalid email or password.</p> : null}
          <label className="block font-black uppercase">Email<input name="email" type="email" required className="mt-2 w-full rounded-xl border-2 border-ink bg-white p-3 font-bold normal-case" placeholder="admin@stalltalk.local" /></label>
          <label className="mt-4 block font-black uppercase">Password<input name="password" type="password" required className="mt-2 w-full rounded-xl border-2 border-ink bg-white p-3 font-bold normal-case" placeholder="••••••••" /></label>
          <button className="mt-5 w-full rounded-xl border-4 border-ink bg-stallRed px-5 py-3 font-black uppercase text-white shadow-brutal">Log in</button>
          <Link href="/" className="mt-4 inline-block font-black uppercase text-stallPurple">Back to public homepage</Link>
        </form>
      </section>
    </main>
  );
}
