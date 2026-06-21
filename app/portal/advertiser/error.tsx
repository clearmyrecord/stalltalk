"use client";

export default function AdvertiserPortalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-paper p-8 text-ink">
      <section className="mx-auto max-w-3xl rounded-2xl border-4 border-ink bg-white p-6 shadow-brutal">
        <p className="font-black uppercase tracking-[.25em] text-stallRed">
          Advertiser Portal
        </p>
        <h1 className="font-display text-5xl uppercase">
          Advertiser portal failed to load
        </h1>
        <p className="mt-4 rounded-xl bg-stallRed p-4 font-black uppercase text-white">
          database query failed
        </p>
        <button
          onClick={reset}
          className="mt-4 rounded-xl bg-ink px-4 py-3 font-black uppercase text-white"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
