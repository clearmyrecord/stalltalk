import type { Role } from "@prisma/client";
import { hashPassword, verifyPassword } from "./passwords";

export const seedLoginUsers = [
  {
    email: "admin@pottyfavor.com",
    password: "admin-password-change-me",
    role: "ADMIN",
    name: "Potty Favor Admin"
  },
  {
    email: "advertiser@pottyfavor.com",
    password: "advertiser-password-change-me",
    role: "ADVERTISER",
    name: "Seed Advertiser"
  },
  {
    email: "venue@pottyfavor.com",
    password: "venue-password-change-me",
    role: "VENUE_MANAGER",
    name: "Seed Venue Manager"
  },
  {
    email: "distributor@pottyfavor.com",
    password: "distributor-password-change-me",
    role: "DISTRIBUTOR",
    name: "Seed Distributor"
  }
] as const;

type SeedUserEmail = (typeof seedLoginUsers)[number]["email"];

type SeedUserClient = { user: any };
type ExistingSeedUser = { email: string; role: Role; status: string; passwordHash: string };


export async function upsertSeedLoginUsers(prisma: SeedUserClient) {
  const users: SeedUserEmail[] = [];

  for (const seedUser of seedLoginUsers) {
    await prisma.user.upsert({
      where: { email: seedUser.email },
      update: {
        name: seedUser.name,
        role: seedUser.role as Role,
        status: "ACTIVE",
        passwordHash: hashPassword(seedUser.password)
      },
      create: {
        email: seedUser.email,
        name: seedUser.name,
        role: seedUser.role as Role,
        status: "ACTIVE",
        passwordHash: hashPassword(seedUser.password)
      }
    });
    users.push(seedUser.email);
  }

  return users;
}

export async function verifySeedLoginUsers(prisma: SeedUserClient) {
  const existingUsers: ExistingSeedUser[] = await prisma.user.findMany({
    where: { email: { in: seedLoginUsers.map((user) => user.email) } },
    select: { email: true, role: true, status: true, passwordHash: true }
  });
  const usersByEmail = new Map(existingUsers.map((user) => [user.email, user]));

  return seedLoginUsers.map((seedUser) => {
    const user = usersByEmail.get(seedUser.email);
    return {
      email: seedUser.email,
      exists: Boolean(user),
      role: user?.role ?? null,
      status: user?.status ?? null,
      passwordMatches: user ? verifyPassword(seedUser.password, user.passwordHash) : false
    };
  });
}
