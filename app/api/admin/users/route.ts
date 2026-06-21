import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const roles: Role[] = ["ADMIN", "ADVERTISER", "VENUE_MANAGER", "DISTRIBUTOR"];

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48) || "account";
}

async function uniqueSlug(kind: "advertiser" | "venue", base: string, publisherId?: string) {
  let candidate = slugify(base);
  for (let i = 2; ; i++) {
    const existing = kind === "advertiser"
      ? await prisma.advertiser.findFirst({ where: { publisherId: publisherId!, slug: candidate }, select: { id: true } })
      : await prisma.venue.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing) return candidate;
    candidate = `${slugify(base)}-${i}`;
  }
}

async function defaultPublisherId() {
  const publisher = await prisma.publisher.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
  if (!publisher) throw new Error("Create a publisher before creating linked advertiser or venue accounts.");
  return publisher.id;
}

async function linkedIds(input: { role: Role; name: string; email: string; advertiserId: string; venueId: string; createLinked: boolean }) {
  if (input.role === "ADVERTISER") {
    if (input.advertiserId) return { advertiserId: input.advertiserId, venueId: null };
    if (input.createLinked) {
      const publisherId = await defaultPublisherId();
      const advertiser = await prisma.advertiser.create({ data: { publisherId, name: input.name, contactEmail: input.email, slug: await uniqueSlug("advertiser", input.name, publisherId) } });
      return { advertiserId: advertiser.id, venueId: null };
    }
  }
  if (input.role === "VENUE_MANAGER") {
    if (input.venueId) return { advertiserId: null, venueId: input.venueId };
    if (input.createLinked) {
      const publisherId = await defaultPublisherId();
      const venue = await prisma.venue.create({ data: { publisherId, name: input.name, slug: await uniqueSlug("venue", input.name), city: "TBD", state: "TBD", address: "TBD" } as any });
      return { advertiserId: null, venueId: venue.id };
    }
  }
  return { advertiserId: null, venueId: null };
}

export async function GET() {
  await requireAdmin();
  const users = await prisma.user.findMany({ include: { advertiser: true, venue: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ ok: true, users });
}

export async function POST(request: Request) {
  await requireAdmin();
  const body = await request.json().catch(() => ({}));
  const email = text(body.email).toLowerCase();
  const name = text(body.name);
  const role = text(body.role) as Role;
  const password = text(body.password);
  const confirmPassword = text(body.confirmPassword);
  if (!email || !name || !roles.includes(role)) return NextResponse.json({ ok: false, error: "Email, name, and role are required." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ ok: false, error: "Password must be at least 8 characters." }, { status: 400 });
  if (password !== confirmPassword) return NextResponse.json({ ok: false, error: "Passwords do not match." }, { status: 400 });
  const links = await linkedIds({ role, name, email, advertiserId: text(body.advertiserId), venueId: text(body.venueId), createLinked: Boolean(body.createLinked) });
  const user = await prisma.user.create({ data: { email, name, role, passwordHash: hashPassword(password), ...links }, include: { advertiser: true, venue: true } });
  return NextResponse.json({ ok: true, user }, { status: 201 });
}

export async function PATCH(request: Request) {
  await requireAdmin();
  const body = await request.json().catch(() => ({}));
  const id = text(body.id);
  if (!id) return NextResponse.json({ ok: false, error: "User id is required." }, { status: 400 });
  const role = text(body.role) as Role;
  const data: any = {};
  if (text(body.email)) data.email = text(body.email).toLowerCase();
  if (text(body.name)) data.name = text(body.name);
  if (roles.includes(role)) data.role = role;
  if (typeof body.advertiserId === "string") data.advertiserId = text(body.advertiserId) || null;
  if (typeof body.venueId === "string") data.venueId = text(body.venueId) || null;
  if (text(body.password)) data.passwordHash = hashPassword(text(body.password));
  const user = await prisma.user.update({ where: { id }, data, include: { advertiser: true, venue: true } });
  return NextResponse.json({ ok: true, user });
}

export async function DELETE(request: Request) {
  await requireAdmin();
  const id = new URL(request.url).searchParams.get("id") || text((await request.json().catch(() => ({}))).id);
  if (!id) return NextResponse.json({ ok: false, error: "User id is required." }, { status: 400 });
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
