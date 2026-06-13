import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const venueId = searchParams.get("venueId");
  const now = new Date();
  const reviews = await prisma.restaurantReview.findMany({
    where: { status: "PUBLISHED", AND: [{ OR: [{ publishDate: null }, { publishDate: { lte: now } }] }, ...(venueId ? [{ OR: [{ venueId }, { venueIds: { has: venueId } }, { venueId: null, venueIds: { isEmpty: true } }] }] : [])] },
    orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }]
  });
  return NextResponse.json({ reviews });
}

export async function POST(request: Request) {
  const body = await request.json();
  const review = await prisma.restaurantReview.create({ data: { ...body, publishDate: body.publishDate ? new Date(body.publishDate) : null } });
  return NextResponse.json({ review }, { status: 201 });
}
