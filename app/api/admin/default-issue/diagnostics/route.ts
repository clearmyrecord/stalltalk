import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDefaultIssueDiagnostics } from "@/lib/default-issue-diagnostics";

export async function GET() {
  await requireAdmin();
  const diagnostics = await getDefaultIssueDiagnostics();
  return NextResponse.json(diagnostics, { status: diagnostics.databaseConnected ? 200 : 500 });
}
