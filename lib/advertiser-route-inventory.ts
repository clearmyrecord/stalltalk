import { prisma } from "./prisma";
import { hasRestroomTypeColumns, restroomTypedSelect } from "./restroom-schema";

export const QR_ROUTE_INVENTORY_MONTH = "QR_ROUTE";
export const ROUTE_SPONSOR_SLOT_COUNT = 8;

let adSlotInventoryColumns: Set<string> | undefined;
let venueColumns: Set<string> | undefined;

const OPTIONAL_AD_SLOT_INVENTORY_COLUMNS = [
  "issueId",
  "audienceSegment",
  "eventCategory",
  "locationLabel",
  "gender",
] as const;

export function isOptionalAdSlotInventoryColumnError(error: unknown) {
  const err = error as {
    code?: string;
    meta?: { column?: string; modelName?: string };
    message?: string;
  };

  if (err?.code !== "P2022") return false;

  const column = err.meta?.column || err.message || "";
  return OPTIONAL_AD_SLOT_INVENTORY_COLUMNS.some((name) =>
    column.includes(name),
  );
}

export function logOptionalAdSlotInventoryColumnError(
  context: string,
  error: unknown,
) {
  console.warn(
    `${context}: optional AdSlotInventory column is missing; continuing without crashing.`,
    error,
  );
}

export async function safeAdSlotInventoryCreateMany(
  db: any,
  data: Array<Record<string, any>>,
) {
  if (!data.length) return;

  const columns = await getAdSlotInventoryColumns(db);
  const safeData = data.map((row) => dynamicAdSlotInventoryData(row, columns));

  try {
    const result = await db.adSlotInventory.createMany({
      data: safeData,
      skipDuplicates: true,
    });

    console.info("adSlotInventory.createMany completed", {
      requested: safeData.length,
      created: result?.count ?? "unknown",
    });
  } catch (error) {
    if (isOptionalAdSlotInventoryColumnError(error)) {
      logOptionalAdSlotInventoryColumnError(
        "adSlotInventory.createMany",
        error,
      );
      return;
    }

    console.error(
      "adSlotInventory.createMany failed; continuing without generated inventory.",
      error,
    );
  }
}

export async function getAdSlotInventoryColumns(db: any = prisma): Promise<Set<string>> {
  if (db === prisma && adSlotInventoryColumns) return adSlotInventoryColumns;

  const columns = await db.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'AdSlotInventory'
  `;

  const names = new Set<string>((columns as Array<{ column_name: string }>).map((column) => column.column_name));

  if (db === prisma) adSlotInventoryColumns = names;

  return names;
}

export async function hasAdSlotInventoryColumn(
  columnName: string,
  db: any = prisma,
) {
  return (await getAdSlotInventoryColumns(db)).has(columnName);
}

export async function hasAdSlotInventoryIssueIdColumn(db: any = prisma) {
  return hasAdSlotInventoryColumn("issueId", db);
}

export async function getVenueColumns(db: any = prisma): Promise<Set<string>> {
  if (db === prisma && venueColumns) return venueColumns;

  const columns = await db.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'Venue'
  `;

  const names = new Set<string>((columns as Array<{ column_name: string }>).map((column) => column.column_name));

  if (db === prisma) venueColumns = names;

  return names;
}

export async function optionalVenueLocationRows(
  venueIds: string[],
  db: any = prisma,
) {
  if (!venueIds.length) {
    return new Map<
      string,
      { latitude?: number | null; longitude?: number | null; zip?: string | null }
    >();
  }

  const columns = await getVenueColumns(db);
  const latitudeColumn = ["latitude", "lat"].find((column) =>
    columns.has(column),
  );
  const longitudeColumn = ["longitude", "lng", "lon"].find((column) =>
    columns.has(column),
  );
  const zipColumn = ["zip", "postalCode", "postal_code"].find((column) =>
    columns.has(column),
  );

  if (!latitudeColumn && !longitudeColumn && !zipColumn) return new Map();

  const selectParts = [
    '"id"',
    latitudeColumn ? `"${latitudeColumn}" AS latitude` : "NULL AS latitude",
    longitudeColumn ? `"${longitudeColumn}" AS longitude` : "NULL AS longitude",
    zipColumn ? `"${zipColumn}" AS zip` : "NULL AS zip",
  ];

  const rows = (await db.$queryRawUnsafe(
    `SELECT ${selectParts.join(", ")} FROM "Venue" WHERE "id" = ANY($1)`,
    venueIds,
  )) as Array<{
    id: string;
    latitude?: unknown;
    longitude?: unknown;
    zip?: string | null;
  }>;

  return new Map(
    rows.map((row) => [
      row.id,
      {
        latitude: row.latitude == null ? null : Number(row.latitude),
        longitude: row.longitude == null ? null : Number(row.longitude),
        zip: row.zip || null,
      },
    ]),
  );
}

export type AdSlotInventoryColumnOptions = {
  includeIssueIdColumn?: boolean;
  includeAudienceSegmentColumn?: boolean;
  includeEventCategoryColumn?: boolean;
  includeLocationLabelColumn?: boolean;
  includeGenderColumn?: boolean;
};

export function dynamicAdSlotInventoryData<T extends Record<string, any>>(
  row: T,
  columns: Set<string>,
) {
  const {
    issueId,
    audienceSegment,
    eventCategory,
    locationLabel,
    gender,
    ...base
  } = row;

  return {
    ...base,
    ...(columns.has("issueId") ? { issueId } : {}),
    ...(columns.has("audienceSegment") ? { audienceSegment } : {}),
    ...(columns.has("eventCategory") ? { eventCategory } : {}),
    ...(columns.has("locationLabel") ? { locationLabel } : {}),
    ...(columns.has("gender") ? { gender } : {}),
  };
}

export function adSlotInventoryColumnOptions(
  columns: Set<string>,
): AdSlotInventoryColumnOptions {
  return {
    includeIssueIdColumn: columns.has("issueId"),
    includeAudienceSegmentColumn: columns.has("audienceSegment"),
    includeEventCategoryColumn: columns.has("eventCategory"),
    includeLocationLabelColumn: columns.has("locationLabel"),
    includeGenderColumn: columns.has("gender"),
  };
}

export function audienceSegmentForRoute(
  restroom?: {
    name?: string | null;
    restroomType?: string | null;
    customTypeLabel?: string | null;
  } | null,
) {
  if (!restroom) return "ALL_RESTROOMS";

  const value = `${restroom.customTypeLabel || ""} ${
    restroom.restroomType || ""
  } ${restroom.name || ""}`.toUpperCase();

  if (value.includes("MEN") && !value.includes("WOMEN")) return "VENUE_MENS";
  if (
    value.includes("WOMEN") ||
    value.includes("WOMENS") ||
    value.includes("LADIES")
  ) {
    return "VENUE_WOMENS";
  }
  if (
    value.includes("FAMILY") ||
    value.includes("ALL_GENDER") ||
    value.includes("ALL-GENDER") ||
    value.includes("GENDER")
  ) {
    return "FAMILY_ALL_GENDER";
  }

  return "CUSTOM";
}

function issueMonthKey(issue: { month: string; year: string | number }) {
  const parsedMonth = new Date(`${issue.month} 1, ${issue.year}`).getMonth();
  const monthNumber = Number.isFinite(parsedMonth) ? parsedMonth + 1 : 1;
  return `${issue.year}-${String(monthNumber).padStart(2, "0")}`;
}

export async function ensureQrRouteAdInventory(qrCodeId: string, db: any = prisma) {
  const [includeTypeColumns, inventoryColumns] = await Promise.all([
    db === prisma ? hasRestroomTypeColumns() : Promise.resolve(true),
    getAdSlotInventoryColumns(db),
  ]);

  const { includeIssueIdColumn } =
    adSlotInventoryColumnOptions(inventoryColumns);

  const qr = await db.qrCode.findUnique({
    where: { id: qrCodeId },
    include: {
      venue: true,
      restroom: { select: restroomTypedSelect(includeTypeColumns) },
    },
  });

  if (
    !qr?.venueId ||
    !qr.venue ||
    qr.venue.status !== "ACTIVE" ||
    !qr.venue.isActive ||
    !["ACTIVE", "DEPLOYED"].includes(qr.status)
  ) {
    console.info("ensureQrRouteAdInventory skipped inactive route", {
      qrCodeId,
      venueId: qr?.venueId,
      qrStatus: qr?.status,
      venueStatus: qr?.venue?.status,
      venueIsActive: qr?.venue?.isActive,
    });
    return;
  }

  const existing: Array<{ slotNumber: number }> =
    await db.adSlotInventory.findMany({
      where: {
        ...(includeIssueIdColumn ? { issueId: null } : {}),
        qrCodeId: qr.id,
        month: QR_ROUTE_INVENTORY_MONTH,
      },
      select: { slotNumber: true },
    });

  const existingSlots = new Set(existing.map((slot) => slot.slotNumber));

  const data = Array.from(
    { length: ROUTE_SPONSOR_SLOT_COUNT },
    (_, index) => index + 1,
  )
    .filter((slotNumber) => !existingSlots.has(slotNumber))
    .map((slotNumber) =>
      dynamicAdSlotInventoryData(
        {
          issueId: null,
          venueId: qr.venueId,
          restroomId: qr.restroomId,
          qrCodeId: qr.id,
          slotNumber,
          month: QR_ROUTE_INVENTORY_MONTH,
          audienceSegment: audienceSegmentForRoute(qr.restroom),
          locationLabel: qr.restroom?.name || qr.venue.name,
          priceCents: 5000,
          status: "OPEN" as const,
        },
        inventoryColumns,
      ),
    );

  console.info("ensureQrRouteAdInventory generated rows", {
    qrCodeId: qr.id,
    venueId: qr.venueId,
    issueId: null,
    rowsCreatedOrRequested: data.length,
    skippedExistingSlots: existingSlots.size,
  });

  await safeAdSlotInventoryCreateMany(db, data);
}

export async function ensureAssignedIssueQrRouteAdInventory(
  issueId: string,
  qrCodeId: string,
  db: any = prisma,
) {
  const [includeTypeColumns, inventoryColumns] = await Promise.all([
    db === prisma ? hasRestroomTypeColumns() : Promise.resolve(true),
    getAdSlotInventoryColumns(db),
  ]);

  const { includeIssueIdColumn } =
    adSlotInventoryColumnOptions(inventoryColumns);

  const [issue, qr] = await Promise.all([
    db.issue.findUnique({ where: { id: issueId } }),
    db.qrCode.findUnique({
      where: { id: qrCodeId },
      include: {
        venue: true,
        restroom: { select: restroomTypedSelect(includeTypeColumns) },
      },
    }),
  ]);

  if (
    !issue ||
    !qr?.venueId ||
    !qr.venue ||
    qr.venue.status !== "ACTIVE" ||
    !qr.venue.isActive ||
    !["ACTIVE", "DEPLOYED"].includes(qr.status)
  ) {
    console.info("ensureAssignedIssueQrRouteAdInventory skipped", {
      qrCodeId,
      issueId,
      venueId: qr?.venueId,
      qrStatus: qr?.status,
      issueStatus: issue?.status,
    });
    return;
  }

  if (!includeIssueIdColumn) {
    console.info(
      "ensureAssignedIssueQrRouteAdInventory falling back to route rows without issueId",
      { qrCodeId: qr.id, issueId: issue.id, venueId: qr.venueId },
    );
    await ensureQrRouteAdInventory(qr.id, db);
    return;
  }

  const month = issueMonthKey(issue);

  const existing: Array<{ slotNumber: number }> =
    await db.adSlotInventory.findMany({
      where: { issueId: issue.id, qrCodeId: qr.id, month },
      select: { slotNumber: true },
    });

  const existingSlots = new Set(existing.map((slot) => slot.slotNumber));

  const data = Array.from(
    { length: ROUTE_SPONSOR_SLOT_COUNT },
    (_, index) => index + 1,
  )
    .filter((slotNumber) => !existingSlots.has(slotNumber))
    .map((slotNumber) =>
      dynamicAdSlotInventoryData(
        {
          issueId: issue.id,
          venueId: qr.venueId,
          restroomId: qr.restroomId,
          qrCodeId: qr.id,
          slotNumber,
          month,
          audienceSegment: audienceSegmentForRoute(qr.restroom),
          locationLabel: qr.restroom?.name || qr.venue.name,
          priceCents: 5000,
          status: "OPEN" as const,
        },
        inventoryColumns,
      ),
    );

  console.info("ensureAssignedIssueQrRouteAdInventory generated rows", {
    qrCodeId: qr.id,
    issueId: issue.id,
    venueId: qr.venueId,
    rowsCreatedOrRequested: data.length,
    skippedExistingSlots: existingSlots.size,
  });

  await safeAdSlotInventoryCreateMany(db, data);
}

function getInventoryParam(
  params: URLSearchParams | Record<string, string | undefined>,
  key: string,
) {
  return params instanceof URLSearchParams ? params.get(key) || undefined : params[key];
}

function monthKeyFromDate(value?: string) {
  if (!value) return undefined;
  const match = value.match(/^(\d{4})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : undefined;
}

function advertiserInventoryFilterParts(
  params: URLSearchParams | Record<string, string | undefined>,
  options: AdSlotInventoryColumnOptions = {},
) {
  const venue = getInventoryParam(params, "venueId");
  const venueName = getInventoryParam(params, "venueName");
  const city = getInventoryParam(params, "city");
  const state = getInventoryParam(params, "state");
  const venueType = getInventoryParam(params, "venueType");
  const audience = getInventoryParam(params, "audienceSegment");
  const status = getInventoryParam(params, "status");
  const qrRoute = getInventoryParam(params, "qrRoute");
  const slotType = getInventoryParam(params, "slotType");
  const location = getInventoryParam(params, "location");
  const eventCategory = getInventoryParam(params, "eventCategory");
  const startMonth = monthKeyFromDate(getInventoryParam(params, "startDate"));
  const endMonth = monthKeyFromDate(getInventoryParam(params, "endDate"));
  const statuses = new Set(["OPEN", "RESERVED", "SOLD", "DISABLED"]);

  const and = [
    ...(qrRoute
      ? [
          {
            OR: [
              { qrCode: { qrSlug: { contains: qrRoute, mode: "insensitive" as const } } },
              { qrCode: { qrName: { contains: qrRoute, mode: "insensitive" as const } } },
              { qrCode: { shortUrl: { contains: qrRoute, mode: "insensitive" as const } } },
              { qrCode: { destinationUrl: { contains: qrRoute, mode: "insensitive" as const } } },
            ],
          },
        ]
      : []),
    ...(location
      ? [
          {
            OR: [
              ...(options.includeLocationLabelColumn === false
                ? []
                : [{ locationLabel: { contains: location, mode: "insensitive" as const } }]),
              { venue: { name: { contains: location, mode: "insensitive" as const } } },
              { venue: { city: { contains: location, mode: "insensitive" as const } } },
              { venue: { state: { contains: location, mode: "insensitive" as const } } },
              { restroom: { name: { contains: location, mode: "insensitive" as const } } },
              { toiletLocation: { label: { contains: location, mode: "insensitive" as const } } },
            ],
          },
        ]
      : []),
    ...(venueName
      ? [{ venue: { name: { contains: venueName, mode: "insensitive" as const } } }]
      : []),
    ...(city
      ? [{ venue: { city: { contains: city, mode: "insensitive" as const } } }]
      : []),
    ...(state
      ? [{ venue: { state: { contains: state, mode: "insensitive" as const } } }]
      : []),
    ...(venueType
      ? [{ venue: { venueType: { contains: venueType, mode: "insensitive" as const } } }]
      : []),
  ];

  const monthRange = {
    ...(startMonth ? { gte: startMonth } : {}),
    ...(endMonth ? { lte: endMonth } : {}),
  };

  return {
    venue,
    audience,
    statusWhere: status && statuses.has(status)
      ? { status: status as any }
      : { status: "OPEN" as const },
    slotType,
    eventCategory,
    and,
    monthWhere: Object.keys(monthRange).length ? { month: monthRange } : {},
  };
}

export function qrRouteInventoryWhere(
  params: URLSearchParams | Record<string, string | undefined>,
  options: AdSlotInventoryColumnOptions = {},
) {
  const { venue, audience, statusWhere, slotType, eventCategory, and } =
    advertiserInventoryFilterParts(params, options);

  return {
    ...(options.includeIssueIdColumn === false ? {} : { issueId: null }),
    month: QR_ROUTE_INVENTORY_MONTH,
    qrCodeId: { not: null },
    ...(venue ? { venueId: venue } : {}),
    ...(audience && options.includeAudienceSegmentColumn !== false
      ? { audienceSegment: audience }
      : {}),
    ...(slotType && Number(slotType) ? { slotNumber: Number(slotType) } : {}),
    ...(eventCategory && options.includeEventCategoryColumn !== false
      ? { eventCategory: { contains: eventCategory, mode: "insensitive" as const } }
      : {}),
    ...(and.length ? { AND: and } : {}),
    ...statusWhere,
    qrCode: {
      is: {
        status: { in: ["ACTIVE", "DEPLOYED"] as any },
        venue: { is: { status: "ACTIVE" as const, isActive: true } },
      },
    },
  };
}

export function publishedIssueInventoryWhere(
  params: URLSearchParams | Record<string, string | undefined>,
  options: AdSlotInventoryColumnOptions = {},
) {
  const { venue, audience, statusWhere, slotType, eventCategory, and, monthWhere } =
    advertiserInventoryFilterParts(params, options);

  return {
    ...(options.includeIssueIdColumn === false ? {} : { issueId: { not: null } }),
    qrCodeId: { not: null },
    ...(venue ? { venueId: venue } : {}),
    ...(audience && options.includeAudienceSegmentColumn !== false
      ? { audienceSegment: audience }
      : {}),
    ...(slotType && Number(slotType) ? { slotNumber: Number(slotType) } : {}),
    ...(eventCategory && options.includeEventCategoryColumn !== false
      ? { eventCategory: { contains: eventCategory, mode: "insensitive" as const } }
      : {}),
    ...(and.length ? { AND: and } : {}),
    ...monthWhere,
    ...statusWhere,
    issue: {
      is: {
        status: "PUBLISHED" as const,
        isPublished: true,
        isArchived: false,
      },
    },
    qrCode: {
      is: {
        status: { in: ["ACTIVE", "DEPLOYED"] as any },
        venue: { is: { status: "ACTIVE" as const, isActive: true } },
      },
    },
  };
}

export function advertiserInventoryWhere(
  params: URLSearchParams | Record<string, string | undefined>,
  options: AdSlotInventoryColumnOptions = {},
) {
  return options.includeIssueIdColumn === false
    ? qrRouteInventoryWhere(params, options)
    : {
        OR: [
          qrRouteInventoryWhere(params, options),
          publishedIssueInventoryWhere(params, options),
        ],
      };
}

export async function ensurePublishedIssueInventoryForAdvertiserRoutes(
  db: any = prisma,
) {
  const inventoryColumns = await getAdSlotInventoryColumns(db);
  const { includeIssueIdColumn } =
    adSlotInventoryColumnOptions(inventoryColumns);

  if (!includeIssueIdColumn) {
    console.info(
      "ensurePublishedIssueInventoryForAdvertiserRoutes using QR-route fallback rows because issueId column is unavailable",
    );

    const routes = await db.qrCode.findMany({
      where: {
        venueId: { not: null },
        status: { in: ["ACTIVE", "DEPLOYED"] },
        venue: { is: { status: "ACTIVE", isActive: true } },
      },
      select: { id: true },
      take: 300,
    });

    for (const route of routes) {
      await ensureQrRouteAdInventory(route.id, db);
    }

    return;
  }

  const includeTypeColumns =
    db === prisma ? await hasRestroomTypeColumns() : true;

  const [routes, issues] = await Promise.all([
    db.qrCode.findMany({
      where: {
        venueId: { not: null },
        status: { in: ["ACTIVE", "DEPLOYED"] },
        venue: { is: { status: "ACTIVE", isActive: true } },
      },
      include: {
        venue: true,
        restroom: { select: restroomTypedSelect(includeTypeColumns) },
      },
      take: 300,
    }),
    db.issue.findMany({
      where: {
        status: "PUBLISHED",
        isPublished: true,
        isArchived: false,
      },
      include: {
        venue: true,
        restroom: { select: restroomTypedSelect(includeTypeColumns) },
        importedEvents: {
          where: { status: { in: ["APPROVED", "PUBLISHED"] } },
          take: 1,
        },
      },
      orderBy: [
        { publishedAt: "desc" },
        { year: "desc" },
        { issueNumber: "desc" },
      ],
      take: 500,
    }),
  ]);

  const data: Array<Record<string, any>> = [];

  const globalIssue = issues.find(
    (issue: any) =>
      !issue.venueId &&
      issue.status === "PUBLISHED" &&
      issue.isPublished === true &&
      issue.isArchived === false,
  );

  for (const route of routes) {
    const assignedVenueIssues = issues.filter((issue: any) => {
      if (!issue.venueId || issue.venueId !== route.venueId) return false;
      if (issue.qrCodeId === route.id) return true;
      if (route.issueId && issue.id === route.issueId) return true;
      return false;
    });
    const routeIssues = assignedVenueIssues.length
      ? assignedVenueIssues
      : globalIssue
        ? [globalIssue]
        : [];

    for (const issue of routeIssues as any[]) {
      const existing: Array<{ slotNumber: number }> =
        await db.adSlotInventory.findMany({
          where: {
            issueId: issue.id,
            qrCodeId: route.id,
          },
          select: { slotNumber: true },
        });

      const existingSlots = new Set(existing.map((slot) => slot.slotNumber));
      const month = issueMonthKey(issue);

      for (
        let slotNumber = 1;
        slotNumber <= ROUTE_SPONSOR_SLOT_COUNT;
        slotNumber += 1
      ) {
        if (existingSlots.has(slotNumber)) continue;

        data.push(
          dynamicAdSlotInventoryData(
            {
              issueId: issue.id,
              venueId: route.venueId,
              restroomId: route.restroomId,
              qrCodeId: route.id,
              slotNumber,
              month,
              audienceSegment: audienceSegmentForRoute(route.restroom),
              eventCategory: issue.importedEvents?.[0]?.category || null,
              locationLabel:
                route.restroom?.name ||
                route.venue?.name ||
                "Assigned permanent QR route",
              priceCents: 5000,
              status: "OPEN" as const,
            },
            inventoryColumns,
          ),
        );
      }
    }
  }

  console.info("ensurePublishedIssueInventoryForAdvertiserRoutes generated rows", {
    routesChecked: routes.length,
    issuesChecked: issues.length,
    rowsCreatedOrRequested: data.length,
  });

  await safeAdSlotInventoryCreateMany(db, data);
}
