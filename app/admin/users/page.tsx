import { UserAdminClient } from "./UserAdminClient";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [users, advertisers, venues] = await Promise.all([
    prisma.user.findMany({ include: { advertiser: { select: { id: true, name: true } }, venue: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.advertiser.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.venue.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
  ]);
  return <section className="grid gap-6"><div><p className="font-black uppercase tracking-[.25em] text-stallRed">Admin-only account management</p><h1 className="font-display text-7xl uppercase">Users</h1><p className="max-w-3xl font-bold">Create real Potty Favor logins for admins, advertisers, venue managers, and distributors. Passwords are hashed before storage.</p></div><UserAdminClient initialUsers={users} advertisers={advertisers} venues={venues} /></section>;
}
