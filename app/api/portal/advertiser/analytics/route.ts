import { NextResponse } from "next/server";
import { advertiserIdForAnalytics, getAdvertiserAnalytics } from "@/lib/advertiser-analytics";
import { requireAdvertiserPortalUser } from "@/lib/advertiser-portal";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireAdvertiserPortalUser();
  const url = new URL(request.url);
  const advertiserId = await advertiserIdForAnalytics(user, url);
  if (user.role === "ADVERTISER" && !advertiserId) {
    return NextResponse.json({ ok: false, error: "Advertiser profile required." }, { status: 403 });
  }
  const analytics = await getAdvertiserAnalytics(advertiserId);
  return NextResponse.json({ ok: true, analytics });
}
