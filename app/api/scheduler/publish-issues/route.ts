import { NextResponse } from "next/server";
import { publishDueIssues } from "@/lib/issue-scheduling";
import { currentUser } from "@/lib/auth";

async function handler(request: Request) {
  const url = new URL(request.url);
  const manual = url.searchParams.get("manual") === "1" || request.headers.get("x-admin-manual") === "1";
  if (manual) {
    const user = await currentUser();
    if (user?.role !== "ADMIN") return NextResponse.json({ ok: false, error: "ADMIN required." }, { status: 403 });
  } else if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET required." }, { status: 401 });
  }
  const summary = await publishDueIssues();
  return NextResponse.json({ ok: true, ...summary });
}
export const GET = handler;
export const POST = handler;
