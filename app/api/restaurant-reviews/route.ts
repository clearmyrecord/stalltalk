import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function reviewPayload(body: any) {
  const { photo, shortDescription, website, cuisine, rating, review, ctaText, ctaUrl, featured, priceRange, ...rest } = body;
  const photoUrl = body.photoUrl ?? photo ?? body.featuredImageUrl ?? null;
  return {
    ...rest,
    title: body.title ?? body.restaurantName ?? "Restaurant Review",
    featuredImageUrl: body.featuredImageUrl ?? photoUrl,
    photoUrl,
    reviewHeadline: body.reviewHeadline ?? shortDescription,
    reviewBody: body.reviewBody ?? review,
    starRating: body.starRating ?? rating,
    cuisineType: body.cuisineType ?? cuisine,
    websiteUrl: body.websiteUrl ?? ctaUrl ?? website,
    publishDate: body.publishDate ? new Date(body.publishDate) : null
  };
}

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
  const review = await prisma.restaurantReview.create({ data: reviewPayload(body) });
  return NextResponse.json({ review }, { status: 201 });
}
