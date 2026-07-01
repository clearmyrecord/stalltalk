import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import {
  ensureQrRouteAdInventory,
  ensurePublishedIssueInventoryForAdvertiserRoutes,
  advertiserInventoryWhere,
  adSlotInventoryColumnOptions,
  getAdSlotInventoryColumns,
  isOptionalAdSlotInventoryColumnError,
  logOptionalAdSlotInventoryColumnError,
} from "@/lib/advertiser-route-inventory";
import { prisma } from "@/lib/prisma";
import { restroomLabelSelect } from "@/lib/restroom-schema";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await currentUser();

  if (!user || !["ADVERTISER", "ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const qrs = await prisma.qrCode.findMany({
    where: {
      venueId: { not: null },
      status: { in: ["ACTIVE", "DEPLOYED"] },
      venue: {
        is: {
          status: "ACTIVE",
          isActive: true,
        },
      },
    },
    select: {
      id: true,
    },
    take: 300,
  });

  const inventoryColumns = await getAdSlotInventoryColumns();
  const inventoryColumnOptions = adSlotInventoryColumnOptions(inventoryColumns);
  await Promise.all(qrs.map(async (qr) => {
    try {
      await ensureQrRouteAdInventory(qr.id);
    } catch (error) {
      if (isOptionalAdSlotInventoryColumnError(error)) {
        logOptionalAdSlotInventoryColumnError("advertiser inventory API generation", error);
      } else {
        console.error("advertiser inventory API generation failed", error);
      }
    }
  }));

  try {
    await ensurePublishedIssueInventoryForAdvertiserRoutes();
  } catch (error) {
    if (isOptionalAdSlotInventoryColumnError(error)) logOptionalAdSlotInventoryColumnError("advertiser inventory API fallback issue generation", error);
    else console.error("advertiser inventory API fallback issue generation failed", error);
  }

  const baseWhere = advertiserInventoryWhere(request.nextUrl.searchParams, inventoryColumnOptions);

  const where =
    user.role === "ADMIN" &&
    request.nextUrl.searchParams.get("includeUnavailable") === "true"
      ? baseWhere
      : {
          ...baseWhere,
          status: "OPEN",
        };

  const inventory = await prisma.adSlotInventory.findMany({
    where: where as any,
    select: {
      id: true,
      venueId: true,
      restroomId: true,
      qrCodeId: true,
      slotNumber: true,
      month: true,
      ...(inventoryColumnOptions.includeAudienceSegmentColumn ? { audienceSegment: true } : {}),
      ...(inventoryColumnOptions.includeEventCategoryColumn ? { eventCategory: true } : {}),
      ...(inventoryColumnOptions.includeLocationLabelColumn ? { locationLabel: true } : {}),
      startsAt: true,
      endsAt: true,
      priceCents: true,
      status: true,
      venue: {
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          venueType: true,
          slug: true,
        },
      },
      restroom: {
        select: restroomLabelSelect,
      },
      qrCode: {
        select: {
          id: true,
          qrName: true,
          qrSlug: true,
          shortUrl: true,
          destinationUrl: true,
          status: true,
        },
      },
      ...(inventoryColumnOptions.includeIssueIdColumn ? {
        issue: {
          select: {
            id: true,
            title: true,
            month: true,
            year: true,
            issueNumber: true,
            status: true,
            isPublished: true,
          },
        },
      } : {}),
    },
    orderBy: [
      { venue: { name: "asc" } },
      { qrCode: { qrSlug: "asc" } },
      { slotNumber: "asc" },
    ],
    take: 100,
  });

  return NextResponse.json({ inventory });
}