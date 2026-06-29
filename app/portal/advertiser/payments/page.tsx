import Link from "next/link";
import {
  AdvertiserProfileRequired,
  advertiserForPortalUser,
  requireAdvertiserPortalUser,
} from "@/lib/advertiser-portal";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function money(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export default async function AdvertiserPaymentsPage() {
  const user = await requireAdvertiserPortalUser();
  const advertiser = await advertiserForPortalUser(user);
  if (!advertiser)
    return (
      <AdvertiserProfileRequired message="Complete your advertiser profile before viewing payments." />
    );

  const [payments, invoices] = await Promise.all([
    prisma.payment.findMany({
      where: { advertiserId: advertiser.id },
      include: { campaign: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.advertiserInvoice.findMany({
      where: { advertiserId: advertiser.id },
      include: { campaign: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <main className="min-h-screen bg-paper p-8 text-ink">
      <section className="mx-auto max-w-5xl rounded-2xl border-4 border-ink bg-white p-6 shadow-brutal">
        <p className="font-black uppercase tracking-[.25em] text-stallRed">
          Advertiser Portal
        </p>
        <h1 className="font-display text-6xl uppercase">Payments</h1>
        <p className="mt-3 font-bold">
          Payments and invoices for {advertiser.name} only.
        </p>
        <Link
          href="/portal/advertiser"
          className="mt-4 inline-flex font-black uppercase text-stallPurple underline"
        >
          Back to Advertiser Portal
        </Link>

        <section className="mt-6 rounded-xl border-2 border-ink bg-paper p-4">
          <h2 className="font-display text-4xl uppercase">Payments</h2>
          <div className="mt-3 grid gap-3">
            {payments.length ? (
              payments.map((payment) => (
                <article
                  key={payment.id}
                  className="rounded-lg border-2 border-ink bg-white p-3"
                >
                  <p className="text-xs font-black uppercase text-stallRed">
                    {payment.status} • {payment.createdAt.toLocaleDateString()}
                  </p>
                  <p className="font-black">{payment.campaign.name}</p>
                  <p>{money(payment.amountCents, payment.currency)}</p>
                </article>
              ))
            ) : (
              <p className="rounded-lg bg-stallYellow p-3 font-black uppercase">
                No payments yet.
              </p>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-xl border-2 border-ink bg-paper p-4">
          <h2 className="font-display text-4xl uppercase">Invoices</h2>
          <div className="mt-3 grid gap-3">
            {invoices.length ? (
              invoices.map((invoice) => (
                <article
                  key={invoice.id}
                  className="rounded-lg border-2 border-ink bg-white p-3"
                >
                  <p className="text-xs font-black uppercase text-stallRed">
                    {invoice.status} • {invoice.createdAt.toLocaleDateString()}
                  </p>
                  <p className="font-black">{invoice.invoiceNumber}</p>
                  <p>{invoice.campaign?.name || "Campaign not linked"}</p>
                  <p>{money(invoice.amountCents, invoice.currency)}</p>
                </article>
              ))
            ) : (
              <p className="rounded-lg bg-stallYellow p-3 font-black uppercase">
                No invoices yet.
              </p>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
