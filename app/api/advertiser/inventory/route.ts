import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { ensureQrRouteAdInventory, qrRouteInventoryWhere } from "@/lib/advertiser-route-inventory";
import { prisma } from "@/lib/prisma";
import { restroomLabelSelect } from "@/lib/restroom-schema";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await currentUser();
  if (!user || !["ADVERTISER", "ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const qrs = await prisma.qrCode.findMany({
    where: { venueId: { not: null }, status: { in: ["ACTIVE", "DEPLOYED"] }, venue: { is: { status: "ACTIVE", isActive: true } } },
    select: { id: true },
    take: 300,
  });
  await Promise.all(qrs.map((qr) => ensureQrRouteAdInventory(qr.id)));

  const where = user.role === "ADMIN"
    ? {
        ...qrRouteInventoryWhere(request.nextUrl.searchParams),
        ...(request.nextUrl.searchParams.get("includeUnavailable") === "true" ? { status: undefined } : {}),
      }
    : qrRouteInventoryWhere(request.nextUrl.searchParams);
  const inventory = await prisma.adSlotInventory.findMany({
    where,
    include: {
      venue: { select: { id: true, name: true, city: true, state: true, venueType: true, slug: true } },
      restroom: { select: restroomLabelSelect },
      qrCode: { select: { id: true, qrName: true, qrSlug: true, shortUrl: true, destinationUrl: true, status: true } },
    },
    orderBy: [{ venue: { name: "asc" } }, { qrCode: { qrSlug: "asc" } }, { slotNumber: "asc" }],
    take: 100,
  });
  return NextResponse.json({ inventory });
}
