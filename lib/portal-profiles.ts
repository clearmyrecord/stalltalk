import { prisma } from "./prisma";

export function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "account";
}

export async function defaultPublisher() {
  const existing = await prisma.publisher.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  return prisma.publisher.create({ data: { name: "Potty Favor", slug: "potty-favor", contactEmail: "admin@pottyfavor.com" } });
}

export async function uniqueAdvertiserSlug(name: string, publisherId: string) {
  const base = slugify(name);
  let slug = base;
  for (let i = 2; await prisma.advertiser.findUnique({ where: { publisherId_slug: { publisherId, slug } } }); i++) slug = `${base}-${i}`;
  return slug;
}

export async function uniqueVenueSlug(name: string) {
  const base = slugify(name);
  let slug = base;
  for (let i = 2; await prisma.venue.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
  return slug;
}
