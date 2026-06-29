import { NextResponse } from "next/server";
import { recordQrScan } from "@/lib/tracking";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const url = new URL(request.url);
  const qr = await import("@/lib/tracking").then((m) => m.findQrRecord(code));
  const issue = qr?.venueId ? await import("@/lib/prisma").then(({ prisma }) => prisma.issue.findFirst({ where: { venueId: qr.venueId, ...(qr.restroomId ? { restroomId: qr.restroomId } : {}), status: "PUBLISHED", isPublished: true, isArchived: false }, orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }] })) : null;
  const destination = new URL(qr?.destinationUrl || (qr?.venue?.slug ? `/v/${qr.venue.slug}` : `/issue`), url.origin);
  destination.searchParams.set("qr", code);
  if (qr?.restroomId) destination.searchParams.set("restroom", qr.restroomId);
  if (issue) destination.searchParams.set("previewIssueId", issue.id);
  try {
    await recordQrScan({ code, request, source: "qr-route" });
  } catch (error) {
    console.error("QR route scan analytics failed", error);
  }
  return NextResponse.redirect(destination);
}
