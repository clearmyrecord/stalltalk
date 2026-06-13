import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "./prisma";

const SESSION_COOKIE = "potty_favor_session";
const SESSION_DAYS = 14;

export function authEnvStatus() {
  return {
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasAuthSecret: Boolean(process.env.AUTH_SECRET),
    isConfigured: Boolean(process.env.DATABASE_URL && process.env.AUTH_SECRET)
  };
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const stored = Buffer.from(key, "hex");
  const candidate = scryptSync(password, salt, stored.length);
  return stored.length === candidate.length && timingSafeEqual(stored, candidate);
}

function hashToken(token: string) {
  const secret = process.env.AUTH_SECRET || "setup-required";
  return createHash("sha256").update(`${token}:${secret}`).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.authSession.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: expiresAt });
}

export async function currentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token || !authEnvStatus().isConfigured) return null;
  try {
    const session = await prisma.authSession.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
    if (!session || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") return null;
    return session.user;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "");
    if (/does not exist|P2021|AuthSession|User/i.test(message)) {
      console.error("[auth-session]", { context: "current_user", table: "AuthSession", relatedTable: "User", query: "findUniqueByTokenHash", prismaCode: (error as { code?: string })?.code, errorName: (error as { name?: string })?.name, meta: (error as { meta?: unknown })?.meta });
      return null;
    }
    throw error;
  }
}

export async function signOut() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await prisma.authSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  cookieStore.delete(SESSION_COOKIE);
}

export async function requireRole(roles: Role[]) {
  const user = await currentUser();
  if (!user || !roles.includes(user.role)) redirect("/signin?error=admin_required");
  return user;
}

export async function requireAdmin() {
  return requireRole(["SUPER_ADMIN", "ADMIN"] as Role[]);
}

export async function requireVenueManager() {
  return requireRole(["VENUE_MANAGER", "VENUE", "SUPER_ADMIN", "ADMIN"] as Role[]);
}

export function isVenueManagerRole(role: Role) {
  return role === "VENUE_MANAGER" || role === "VENUE";
}
