import type { Role, User } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireRole } from "./auth";
import { prisma } from "./prisma";

export const ADVERTISER_PORTAL_ROLES = ["ADVERTISER", "ADMIN"] as Role[];

export async function requireAdvertiserPortalUser() {
  return requireRole(ADVERTISER_PORTAL_ROLES);
}

export async function advertiserForPortalUser(user: User) {
  if (!user.advertiserId) return null;
  return prisma.advertiser.findUnique({ where: { id: user.advertiserId } });
}

export function AdvertiserProfileRequired({
  message = "Complete your advertiser profile before viewing advertiser-only data.",
}: {
  message?: string;
}) {
  return (
    <main className="min-h-screen bg-paper p-8 text-ink">
      <section className="mx-auto max-w-3xl rounded-2xl border-4 border-ink bg-white p-6 shadow-brutal">
        <p className="font-black uppercase tracking-[.25em] text-stallRed">
          Advertiser Portal
        </p>
        <h1 className="font-display text-5xl uppercase">
          Complete your advertiser profile
        </h1>
        <p className="mt-4 rounded-xl border-4 border-ink bg-stallYellow p-4 font-black uppercase">
          {message}
        </p>
        <a
          href="/portal/advertiser/profile"
          className="mt-4 inline-flex rounded-xl bg-ink px-4 py-3 font-black uppercase text-white"
        >
          Complete advertiser profile
        </a>
      </section>
    </main>
  );
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
