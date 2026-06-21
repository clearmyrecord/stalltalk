import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function reviewPayload(body: any) {
  const { photo, shortDescription, website, cuisine, rating, review, ctaText, ctaUrl, featured, priceRange, ...rest } = body;
  const photoUrl = body.photoUrl ?? photo ?? body.featuredImageUrl;
  return {
    ...rest,
    ...(photoUrl !== undefined ? { featuredImageUrl: body.featuredImageUrl ?? photoUrl, photoUrl } : {}),
    ...(shortDescription !== undefined ? { reviewHeadline: body.reviewHeadline ?? shortDescription } : {}),
    ...(review !== undefined ? { reviewBody: body.reviewBody ?? review } : {}),
    ...(rating !== undefined ? { starRating: body.starRating ?? rating } : {}),
    ...(cuisine !== undefined ? { cuisineType: body.cuisineType ?? cuisine } : {}),
    ...(website !== undefined || ctaUrl !== undefined ? { websiteUrl: body.websiteUrl ?? ctaUrl ?? website } : {}),
    publishDate: body.publishDate ? new Date(body.publishDate) : undefined
  };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const review = await prisma.restaurantReview.findUnique({ where: { id } });
  return review ? NextResponse.json({ review }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const review = await prisma.restaurantReview.update({ where: { id }, data: reviewPayload(body) });
  return NextResponse.json({ review });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.restaurantReview.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
