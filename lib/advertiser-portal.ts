import type { Role, User } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireRole } from "./auth";
import { prisma } from "./prisma";

export const ADVERTISER_PORTAL_ROLES = ["ADVERTISER", "ADMIN"] as Role[];

export async function requireAdvertiserPortalUser() {
  return requireRole(ADVERTISER_PORTAL_ROLES);
}

export async function advertiserForPortalUser(user: User) {
  if (user.role === "ADVERTISER" && !user.advertiserId) redirect("/portal/advertiser");
  if (!user.advertiserId) return null;
  return prisma.advertiser.findUnique({ where: { id: user.advertiserId } });
}

export function parseAdvertiserPortalNote(note?: string | null) {
  if (!note) return { website: "", phone: "", category: "" };
  try {
    const parsed = JSON.parse(note) as Record<string, unknown>;
    return {
      website: typeof parsed.website === "string" ? parsed.website : "",
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      category: typeof parsed.category === "string" ? parsed.category : "",
    };
  } catch {
    return { website: "", phone: "", category: "" };
  }
}
