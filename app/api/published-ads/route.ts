import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const venueId = searchParams.get("venueId") || searchParams.get("venue_id") || "";
  const issueId = searchParams.get("issueId") || "";

  const issue = issueId
    ? await prisma.issue.findUnique({ where: { id: issueId }, include: { adSlots: { include: { ad: true }, orderBy: { slotNumber: "asc" } } } })
    : await prisma.issue.findFirst({
        where: { status: "PUBLISHED", ...(venueId ? { venueId } : {}) },
        orderBy: [{ year: "desc" }, { issueNumber: "desc" }],
        include: { adSlots: { include: { ad: true }, orderBy: { slotNumber: "asc" } } }
      });

  const ads = (issue?.adSlots || [])
    .filter((slot) => slot.ad.status === "ACTIVE")
    .map((slot) => ({
      id: slot.ad.id,
      name: slot.ad.title,
      business_name: slot.ad.businessName,
      headline: slot.ad.generatedHeadline || slot.ad.title,
      offer: slot.ad.generatedSubheadline || slot.ad.offer,
      cta: slot.ad.ctaText,
      slot_id: "content-ad",
      placement: slot.slotNumber,
      width: 320,
      height: 100,
      image_url: slot.ad.artworkUrl,
      click_url: slot.ad.targetUrl,
      status: "published",
      venue_id: issue?.venueId,
      created_at: slot.ad.createdAt.toISOString(),
      updated_at: slot.ad.updatedAt.toISOString(),
      published_at: slot.ad.updatedAt.toISOString()
    }));

  return NextResponse.json(ads, { headers: { "Cache-Control": "no-store" } });
}
