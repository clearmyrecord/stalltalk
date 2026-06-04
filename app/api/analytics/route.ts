import { NextResponse } from "next/server";
import type { AnalyticsEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json();
  await prisma.analyticsEvent.create({
    data: {
      publisherId: body.publisherId || null,
      venueId: body.venueId || null,
      restroomId: body.restroomId || null,
      qrCodeId: body.qrCodeId || null,
      issueId: body.issueId || null,
      advertiserId: body.advertiserId || null,
      adId: body.adId || null,
      slotNumber: body.slotNumber ? Number(body.slotNumber) : null,
      visitorId: body.visitorId || null,
      sessionId: body.sessionId || null,
      durationMs: body.durationMs ? Number(body.durationMs) : null,
      path: body.path || null,
      type: body.type as AnalyticsEventType,
      metadata: body.metadata || null
    }
  });
  return NextResponse.json({ ok: true });
}
