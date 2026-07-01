import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { defaultPublisher, uniqueVenueSlug } from "@/lib/portal-profiles";

function value(form: FormData, name: string) {
  return String(form.get(name) || "").trim();
}

function nullableValue(form: FormData, name: string) {
  const text = value(form, name);
  return text ? text : null;
}

function validUrl(url: string) {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function validEmail(email: string) {
  return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function PATCH(request: Request) {
  try {
    const user = await currentUser();
    if (!user || (user.role !== "VENUE_MANAGER" && user.role !== "ADMIN")) {
      return NextResponse.json(
        { ok: false, error: "Venue manager access required." },
        { status: 403 },
      );
    }

    const form = await request.formData();
    const name = value(form, "venueName");
    const venueType = value(form, "venueType") || "venue";
    const address = value(form, "address");
    const city = value(form, "city");
    const state = value(form, "state");
    const zip = nullableValue(form, "zip");
    const phone = nullableValue(form, "phone");
    const website = nullableValue(form, "website");
    const contactName = nullableValue(form, "contactName");
    const contactEmail = nullableValue(form, "contactEmail");
    const description = nullableValue(form, "description");
    const logoImageUrl = nullableValue(form, "logoImageUrl");

    if (!name || !address || !city || !state) {
      return NextResponse.json(
        { ok: false, error: "Venue name, address, city, and state are required." },
        { status: 400 },
      );
    }
    if (!validUrl(website || "")) {
      return NextResponse.json(
        { ok: false, error: "Website must be a valid http or https URL." },
        { status: 400 },
      );
    }
    if (!validUrl(logoImageUrl || "")) {
      return NextResponse.json(
        { ok: false, error: "Logo/image URL must be a valid http or https URL." },
        { status: 400 },
      );
    }
    if (!validEmail(contactEmail || "")) {
      return NextResponse.json(
        { ok: false, error: "Contact email must be a valid email address." },
        { status: 400 },
      );
    }

    const data = {
      name,
      address,
      city,
      state,
      zip,
      phone,
      website,
      contactName,
      contactEmail,
      description,
      logoImageUrl,
      venueType,
    };

    if (user.venueId) {
      const updated = await prisma.venue.update({
        where: { id: user.venueId },
        data,
        select: { id: true },
      });
      return NextResponse.json({ ok: true, venueId: updated.id });
    }

    const publisher = await defaultPublisher();
    const venue = await prisma.venue.create({
      data: {
        publisherId: publisher.id,
        slug: await uniqueVenueSlug(name),
        ...data,
      },
      select: { id: true },
    });
    await prisma.user.update({ where: { id: user.id }, data: { venueId: venue.id } });
    return NextResponse.json({ ok: true, venueId: venue.id });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to save venue profile.",
      },
      { status: 500 },
    );
  }
}
