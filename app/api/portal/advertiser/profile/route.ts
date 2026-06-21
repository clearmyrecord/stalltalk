import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { defaultPublisher, uniqueAdvertiserSlug } from "@/lib/portal-profiles";

export async function PATCH(request: Request) {
  try {
    const user = await currentUser();
    if (!user || (user.role !== "ADVERTISER" && user.role !== "ADMIN")) return NextResponse.json({ ok: false, error: "Advertiser access required." }, { status: 403 });
    const form = await request.formData();
    const name = String(form.get("businessName") || "").trim();
    if (!name) return NextResponse.json({ ok: false, error: "Business name is required." }, { status: 400 });
    const publisher = await defaultPublisher();
    const advertiser = await prisma.advertiser.create({ data: { publisherId: publisher.id, name, slug: await uniqueAdvertiserSlug(name, publisher.id), contactEmail: user.email, portalNote: JSON.stringify({ website: String(form.get("website") || ""), phone: String(form.get("phone") || ""), category: String(form.get("category") || "") }) } });
    await prisma.user.update({ where: { id: user.id }, data: { advertiserId: advertiser.id } });
    return NextResponse.json({ ok: true, advertiserId: advertiser.id });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to save advertiser profile." }, { status: 500 });
  }
}
