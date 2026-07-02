import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function currentMonth() { return new Date().toISOString().slice(0, 7); }
function includes(haystack?: string | null, needle?: string) { return !needle || !haystack || haystack.toLowerCase().includes(needle.toLowerCase()); }

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADVERTISER" && user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json();
  const budgetCents = Math.max(0, Math.round(Number(body.budget || 0) * 100));
  const month = String(body.month || currentMonth());
  const slots = await prisma.adSlotInventory.findMany({
    where: { status: "OPEN", month, venue: { isActive: true, status: "ACTIVE" } },
    include: { venue: true, qrCode: true, restroom: true, issue: true, toiletLocation: true },
    orderBy: [{ venue: { city: "asc" } }, { priceCents: "asc" }],
    take: 150,
  });
  const targetCity = String(body.city || "");
  const targetState = String(body.state || "");
  const targetZip = String(body.zip || "");
  const scored = slots.map((slot) => {
    let score = 0;
    const reasons: string[] = [];
    if (targetCity && includes(slot.venue.city, targetCity)) { score += 5; reasons.push(`Matches ${slot.venue.city}`); }
    if (targetState && includes(slot.venue.state, targetState)) { score += 4; reasons.push(`Matches ${slot.venue.state}`); }
    if (targetZip && includes(slot.venue.zip, targetZip)) { score += 6; reasons.push(`ZIP match ${slot.venue.zip}`); }
    if (body.industry && includes(`${slot.venue.venueType} ${slot.audienceSegment}`, String(body.industry))) { score += 2; reasons.push("Audience/venue type fit"); }
    if (slot.qrCodeId) { score += 2; reasons.push("Permanent QR route inventory"); }
    if (slot.issueId) reasons.push("Follows the current issue behind this route");
    reasons.push(`${slot.audienceSegment.replaceAll("_", " ")} audience`);
    return { slot, score, reasons };
  }).sort((a, b) => b.score - a.score || a.slot.priceCents - b.slot.priceCents);
  let total = 0;
  const selected = [] as typeof scored;
  for (const item of scored) {
    if (budgetCents && total + item.slot.priceCents > budgetCents && selected.length) continue;
    selected.push(item); total += item.slot.priceCents;
    if (budgetCents && total >= budgetCents) break;
    if (!budgetCents && selected.length >= 6) break;
  }
  return NextResponse.json({
    month,
    recommendations: selected.map(({ slot, reasons, score }) => ({
      id: slot.id,
      venueName: slot.venue.name,
      venueType: slot.venue.venueType,
      city: slot.venue.city,
      state: slot.venue.state,
      zip: slot.venue.zip,
      slotNumber: slot.slotNumber,
      audienceSegment: slot.audienceSegment,
      locationLabel: slot.locationLabel || slot.toiletLocation?.label || slot.restroom?.name || "Permanent QR route",
      priceCents: slot.priceCents,
      qrRoute: slot.qrCode?.shortUrl || (slot.qrCode ? `/qr/${slot.qrCode.qrSlug}` : null),
      issueName: slot.issue?.title || null,
      estimatedReach: "Reach estimate pending live route analytics",
      why: reasons.join(" • "),
      score,
    })),
  });
}
