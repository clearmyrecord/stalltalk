import { createPublisher } from "@/lib/actions";
import { prisma } from "@/lib/prisma";

export default async function PublishersPage() {
  const publishers = await prisma.publisher.findMany({ include: { distributors: true, advertisers: true, venues: true } });
  return <section><h1 className="font-display text-7xl uppercase">Publishers</h1><form action={createPublisher} className="mt-4 grid gap-3 rounded-2xl border-4 border-ink bg-white p-4 shadow-brutal md:grid-cols-4"><input name="name" placeholder="Publisher name" required className="rounded border-2 border-ink p-3"/><input name="slug" placeholder="slug" className="rounded border-2 border-ink p-3"/><input name="contactEmail" placeholder="email" required className="rounded border-2 border-ink p-3"/><button className="rounded bg-ink p-3 font-black uppercase text-white">Add Publisher</button></form><div className="mt-6 grid gap-4 md:grid-cols-3">{publishers.map((p) => <article key={p.id} className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal"><p className="text-xs font-black uppercase text-stallRed">{p.status}</p><h2 className="font-display text-4xl uppercase">{p.name}</h2><p className="font-bold">{p.contactEmail}</p><p className="mt-2 font-black">{p.distributors.length} distributors • {p.advertisers.length} advertisers • {p.venues.length} venues</p></article>)}</div></section>;
}
