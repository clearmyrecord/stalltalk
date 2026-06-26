import { NextResponse } from "next/server";
import { advertiserIdForAnalytics, getAdvertiserAnalytics } from "@/lib/advertiser-analytics";
import { requireAdvertiserPortalUser } from "@/lib/advertiser-portal";

export const dynamic = "force-dynamic";

export async function GET(_request: Request) {
  const user = await requireAdvertiserPortalUser();
  const advertiserId = await advertiserIdForAnalytics(user);
  if (!advertiserId) {
    return NextResponse.json({ ok: false, error: "Advertiser profile required." }, { status: 403 });
  }
  const analytics = await getAdvertiserAnalytics(advertiserId);
  return NextResponse.json({ ok: true, analytics });
}
