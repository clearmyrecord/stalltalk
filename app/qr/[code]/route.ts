import { NextResponse } from "next/server";
import { recordQrScan } from "@/lib/tracking";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const url = new URL(request.url);
  const destination = new URL(`/issue?qr=${encodeURIComponent(code)}`, url.origin);
  try {
    await recordQrScan({ code, request, source: "qr-route" });
  } catch (error) {
    console.error("QR route scan analytics failed", error);
  }
  return NextResponse.redirect(destination);
}
