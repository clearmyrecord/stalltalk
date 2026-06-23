import { NextRequest, NextResponse } from "next/server";
import { publishScheduledIssues } from "@/lib/issue-scheduling";
import { requireAdmin } from "@/lib/auth";
async function handler(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || request.nextUrl.searchParams.get("secret");
  const manual = request.nextUrl.searchParams.get("manual") === "1";
  if (manual) await requireAdmin(); else if (secret && auth !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await publishScheduledIssues());
}
export { handler as GET, handler as POST };
