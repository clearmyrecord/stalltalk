import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publishedIssueInventoryWhere } from "@/lib/issue-inventory";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await currentUser();
  if (!user || !["ADVERTISER", "ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const where = user.role === "ADMIN"
    ? {
        ...publishedIssueInventoryWhere(request.nextUrl.searchParams),
        ...(request.nextUrl.searchParams.get("includeUnavailable") === "true" ? { status: undefined } : {}),
      }
    : publishedIssueInventoryWhere(request.nextUrl.searchParams);
  const inventory = await prisma.adSlotInventory.findMany({
    where,
    include: {
      venue: { select: { id: true, name: true, city: true, state: true, venueType: true } },
      restroom: { select: { id: true, name: true, restroomType: true, customTypeLabel: true } },
      issue: { select: { id: true, title: true, month: true, year: true, issueNumber: true, status: true, isPublished: true } },
    },
    orderBy: [{ month: "asc" }, { venue: { name: "asc" } }, { slotNumber: "asc" }],
    take: 100,
  });
  return NextResponse.json({ inventory });
}
