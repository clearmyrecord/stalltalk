import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { upsertSeedLoginUsers, verifySeedLoginUsers } from "@/lib/seed-users";

export const dynamic = "force-dynamic";

function hasValidToken(token: string | null) {
  const expected = process.env.ADMIN_PUBLISH_TOKEN;
  if (!expected || !token) return false;

  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);
  return tokenBuffer.length === expectedBuffer.length && timingSafeEqual(tokenBuffer, expectedBuffer);
}

async function requestToken(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
    return typeof body?.token === "string" ? body.token : null;
  }

  const formData = await request.formData().catch(() => null);
  const token = formData?.get("token");
  return typeof token === "string" ? token : null;
}

export async function POST(request: Request) {
  const token = await requestToken(request);
  if (!hasValidToken(token)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const users = await upsertSeedLoginUsers(prisma);
  return NextResponse.json({ ok: true, users });
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!hasValidToken(token)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const users = await verifySeedLoginUsers(prisma);
  return NextResponse.json({ ok: true, users });
}
