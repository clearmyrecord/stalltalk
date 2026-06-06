import { pbkdf2Sync, randomBytes, timingSafeEqual, createHmac } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "stalltalk_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const PASSWORD_ITERATIONS = 310000;
const PASSWORD_KEY_LENGTH = 32;
const PASSWORD_DIGEST = "sha256";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  publisherId: string | null;
  advertiserId: string | null;
  venueId: string | null;
};

function authSecret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "stalltalk-local-dev-secret-change-me";
}

function sign(value: string) {
  return createHmac("sha256", authSecret()).update(value).digest("base64url");
}

function sessionToken(userId: string) {
  const payload = `${userId}.${Date.now()}`;
  return `${payload}.${sign(payload)}`;
}

function readUserId(token: string | undefined) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, issuedAt, signature] = parts;
  const payload = `${userId}.${issuedAt}`;
  if (sign(payload) !== signature) return null;
  const issuedMs = Number(issuedAt);
  if (!Number.isFinite(issuedMs) || Date.now() - issuedMs > SESSION_MAX_AGE_SECONDS * 1000) return null;
  return userId;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST).toString("base64url");
  return `pbkdf2:${PASSWORD_ITERATIONS}:${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [scheme, iterations, salt, hash] = storedHash.split(":");
  if (scheme !== "pbkdf2" || !iterations || !salt || !hash) return false;
  const candidate = pbkdf2Sync(password, salt, Number(iterations), PASSWORD_KEY_LENGTH, PASSWORD_DIGEST);
  const expected = Buffer.from(hash, "base64url");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export async function currentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const userId = readUserId(cookieStore.get(SESSION_COOKIE)?.value);
  if (!userId) return null;

  const user = await prisma.user.findFirst({
    where: { id: userId, status: "ACTIVE" },
    select: { id: true, email: true, name: true, role: true, publisherId: true, advertiserId: true, venueId: true }
  });
  return user;
}

export async function requireUser(roles?: UserRole[]) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect(roleHome(user.role));
  return user;
}

export function roleHome(role: UserRole) {
  if (role === "ADMIN") return "/admin";
  if (role === "ADVERTISER") return "/portal/advertiser";
  return "/portal/venue";
}

export async function signIn(formData: FormData) {
  "use server";
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.status !== "ACTIVE" || !verifyPassword(password, user.passwordHash)) {
    redirect("/login?error=invalid");
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastSignedInAt: new Date() } });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionToken(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/"
  });
  redirect(roleHome(user.role));
}

export async function signOut() {
  "use server";
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
