import { signIn } from "@/lib/actions";
import { authEnvStatus } from "@/lib/auth";
import { ensureBootstrapAdmin } from "@/lib/bootstrap-admin";

export const dynamic = "force-dynamic";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string; setup?: string }> }) {
  const params = await searchParams;
  const auth = authEnvStatus();
  const bootstrap = auth.hasDatabaseUrl ? await ensureBootstrapAdmin() : null;
  return (
    <main className="min-h-screen bg-paper p-6 text-ink">
      <section className="mx-auto max-w-xl rounded-2xl border-4 border-ink bg-white p-6 shadow-brutal">
        <p className="font-black uppercase tracking-[.25em] text-stallRed">Role-based sign-in</p>
        <h1 className="font-display text-6xl uppercase">Potty Favor Login</h1>
        {!auth.isConfigured ? <p className="mt-4 rounded-xl border-2 border-ink bg-stallYellow p-3 font-black">Setup required: set DATABASE_URL and AUTH_SECRET to enable secure super admin, admin, advertiser, distributor, and venue manager sessions.</p> : null}
        {params.error === "credentials" ? <p className="mt-4 rounded-xl bg-stallRed p-3 font-black text-white">Email or password was not recognized.</p> : null}
        {params.error === "role" ? <p className="mt-4 rounded-xl bg-stallRed p-3 font-black text-white">That account cannot access the requested dashboard. Sign in with the correct role.</p> : null}
        {params.setup === "auth" ? <p className="mt-4 rounded-xl bg-stallYellow p-3 font-black">Login is disabled until AUTH_SECRET and DATABASE_URL are configured.</p> : null}
        {bootstrap?.created ? <p className="mt-4 rounded-xl bg-stallYellow p-3 font-black">Emergency bootstrap admin created for admin@pottyfavor.com. Change the password after signing in.</p> : null}
        {bootstrap?.error ? <p className="mt-4 rounded-xl bg-stallRed p-3 font-black text-white">Bootstrap admin check failed: {bootstrap.error}</p> : null}
        <form action={signIn} className="mt-6 grid gap-3">
          <label className="grid gap-1 font-black uppercase">Email<input name="email" type="email" required className="rounded border-2 border-ink p-3" /></label>
          <label className="grid gap-1 font-black uppercase">Password<input name="password" type="password" required className="rounded border-2 border-ink p-3" /></label>
          <button className="rounded-xl bg-ink px-5 py-3 font-black uppercase text-white">Sign in</button>
        </form>
        <p className="mt-4 text-sm font-bold">Seed users: admin@pottyfavor.com, advertiser@pottyfavor.com, distributor@pottyfavor.com, and venue@pottyfavor.com. Admin publish tokens remain server-side or in local browser settings only.</p>
      </section>
    </main>
  );
}
