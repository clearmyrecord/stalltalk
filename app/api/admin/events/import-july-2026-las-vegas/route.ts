import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { importJuly2026LasVegasEvents } from "@/lib/july-2026-las-vegas-events";

export async function POST() {
  await requireAdmin();
  const result = await importJuly2026LasVegasEvents();
  return NextResponse.json({ ok: true, ...result });
}
