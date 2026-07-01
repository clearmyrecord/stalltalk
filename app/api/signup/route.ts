import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword } from "@/lib/auth";
import { defaultPublisher, uniqueAdvertiserSlug, uniqueVenueSlug } from "@/lib/portal-profiles";

function value(form: FormData, key: string) { return String(form.get(key) || "").trim(); }

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const accountType = value(form, "accountType").toLowerCase();
    const name = value(form, "name");
    const email = value(form, "email").toLowerCase();
    const password = value(form, "password");
    const confirm = value(form, "confirmPassword");
    const businessName = value(form, "businessName");
    if (!email || !name || !password || !businessName) return NextResponse.json({ ok: false, error: "Name, email, password, and business/venue name are required." }, { status: 400 });
    if (password !== confirm) return NextResponse.json({ ok: false, error: "Passwords do not match." }, { status: 400 });
    if (await prisma.user.findUnique({ where: { email } })) return NextResponse.json({ ok: false, error: "An account with that email already exists." }, { status: 409 });
    const publisher = await defaultPublisher();
    const portalNote = JSON.stringify({ website: value(form, "website"), phone: value(form, "phone") });
    if (accountType === "advertiser") {
      const advertiser = await prisma.advertiser.create({ data: { publisherId: publisher.id, name: businessName, slug: await uniqueAdvertiserSlug(businessName, publisher.id), contactEmail: email, portalNote } });
      const user = await prisma.user.create({ data: { email, name, role: "ADVERTISER", passwordHash: hashPassword(password), advertiserId: advertiser.id } });
      await createSession(user.id);
      return NextResponse.json({ ok: true, redirectTo: "/portal/advertiser" });
    }
    if (accountType === "venue") {
      const venue = await prisma.venue.create({ data: { publisherId: publisher.id, name: businessName, slug: await uniqueVenueSlug(businessName), address: "Pending", city: "Pending", state: "Pending", venueType: "venue", website: value(form, "website") || null, phone: value(form, "phone") || null, contactName: name, contactEmail: email } });
      const user = await prisma.user.create({ data: { email, name, role: "VENUE_MANAGER", passwordHash: hashPassword(password), venueId: venue.id } });
      await createSession(user.id);
      return NextResponse.json({ ok: true, redirectTo: "/portal/venue" });
    }
    return NextResponse.json({ ok: false, error: "Choose advertiser or venue account type." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to create account." }, { status: 500 });
  }
}
