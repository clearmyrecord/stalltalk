import { permanentQrUrl } from "@/lib/venue-qr";

type DashboardVenueQr = {
  id: string;
  qrSlug: string;
  publicToken?: string | null;
  shortUrl?: string | null;
  qrType: string;
  restroomId?: string | null;
};

type DashboardQrDb = {
  qrCode: {
    findMany: (args: any) => Promise<DashboardVenueQr[]>;
    update: (args: any) => Promise<DashboardVenueQr>;
  };
};

export function selectDashboardVenueQr<T extends DashboardVenueQr>(qrCodes: T[]) {
  return qrCodes.find((qr) => qr.qrType === "VENUE" && !qr.restroomId) || qrCodes.find((qr) => !qr.restroomId) || null;
}

export function dashboardPermanentVenueQrUrl(qr: DashboardVenueQr | null | undefined, venue: { publicToken?: string | null; slug?: string | null }) {
  return permanentQrUrl(qr, venue);
}

export async function getDashboardVenueQr(venueId: string, db: DashboardQrDb, ensureVenueQrs: (venueId: string) => Promise<unknown>) {
  const activeVenueQr = await findDashboardVenueQr(venueId, db, true);
  if (activeVenueQr) return activeVenueQr;

  const existingVenueQr = await findDashboardVenueQr(venueId, db, false);
  if (existingVenueQr) {
    return db.qrCode.update({
      where: { id: existingVenueQr.id },
      data: { isActive: true, status: "ACTIVE" },
    });
  }

  await ensureVenueQrs(venueId);
  return findDashboardVenueQr(venueId, db, true);
}

async function findDashboardVenueQr(venueId: string, db: DashboardQrDb, activeOnly: boolean) {
  const qrCodes = await db.qrCode.findMany({
    where: {
      venueId,
      restroomId: null,
      ...(activeOnly ? { isActive: true, status: "ACTIVE" } : {}),
    },
    orderBy: [{ qrType: "desc" }, { createdAt: "asc" }],
  });
  return selectDashboardVenueQr(qrCodes);
}
