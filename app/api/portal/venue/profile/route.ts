import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { defaultPublisher, uniqueVenueSlug } from "@/lib/portal-profiles";

export async function PATCH(request: Request) {
  try {
    const user = await currentUser();
    if (!user || (user.role !== "VENUE_MANAGER" && user.role !== "ADMIN")) return NextResponse.json({ ok: false, error: "Venue manager access required." }, { status: 403 });
    const form = await request.formData();
    const name = String(form.get("venueName") || "").trim();
    const address = String(form.get("address") || "").trim();
    const city = String(form.get("city") || "").trim();
    const state = String(form.get("state") || "").trim();
    if (!name || !address || !city || !state) return NextResponse.json({ ok: false, error: "Venue name, address, city, and state are required." }, { status: 400 });
    const publisher = await defaultPublisher();
    const venue = await prisma.venue.create({ data: { publisherId: publisher.id, name, slug: await uniqueVenueSlug(name), address, city, state, venueType: "venue" } });
    await prisma.user.update({ where: { id: user.id }, data: { venueId: venue.id } });
    return NextResponse.json({ ok: true, venueId: venue.id });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to save venue profile." }, { status: 500 });
  }
}
