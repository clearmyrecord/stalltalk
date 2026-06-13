import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const review = await prisma.restaurantReview.findUnique({ where: { id } });
  return review ? NextResponse.json({ review }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const review = await prisma.restaurantReview.update({ where: { id }, data: { ...body, publishDate: body.publishDate ? new Date(body.publishDate) : undefined } });
  return NextResponse.json({ review });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.restaurantReview.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
