import { NextResponse } from "next/server";
import { recordAdClick } from "@/lib/tracking";

export async function GET(request: Request, { params }: { params: Promise<{ adId: string }> }) {
  const { adId } = await params;
  const url = new URL(request.url);
  const target = url.searchParams.get("target") || "/issue";
  try {
    await recordAdClick({ adId, slotNumber: Number(url.searchParams.get("slot")) || null, qrCode: url.searchParams.get("qr"), targetUrl: target, request });
  } catch (error) {
    console.error("Ad click analytics failed", error);
  }
  return NextResponse.redirect(new URL(target, url.origin));
}
