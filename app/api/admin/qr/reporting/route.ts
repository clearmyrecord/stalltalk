import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getQrReporting, parseReportingRange } from "@/lib/qrReporting";

function csv(rows: Record<string, unknown>[]) {
  const keys = Object.keys(rows[0] || { empty: "" });
  const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  return [keys.join(","), ...rows.map((row) => keys.map((key) => esc(row[key])).join(","))].join("\n");
}

export async function GET(request: Request) {
  await requireAdmin();
  const { searchParams } = new URL(request.url);
  const report = await getQrReporting(parseReportingRange(searchParams.get("range"), searchParams.get("from"), searchParams.get("to")));
  const exportType = searchParams.get("export");
  if (exportType) {
    const rows = exportType === "scan-log" ? report.scanLog : exportType === "venues" ? report.venuePerformance : exportType === "ads" ? report.adAttribution : report.qrPerformance;
    return new Response(csv(rows as Record<string, unknown>[]), { headers: { "content-type": "text/csv", "content-disposition": `attachment; filename="qr-${exportType}.csv"` } });
  }
  return NextResponse.json(report);
}
