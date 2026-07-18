import { permanentQrUrl } from "@/lib/venue-qr";

type DashboardVenueQr = {
  id: string;
  qrSlug: string;
  publicToken?: string | null;
  shortUrl?: string | null;
  qrType: string;
  restroomId?: string | null;
};

export function selectDashboardVenueQr<T extends DashboardVenueQr>(qrCodes: T[]) {
  return qrCodes.find((qr) => qr.qrType === "VENUE" && !qr.restroomId) || qrCodes.find((qr) => !qr.restroomId) || null;
}

export function dashboardPermanentVenueQrUrl(qr: DashboardVenueQr | null | undefined, venue: { publicToken?: string | null; slug?: string | null }) {
  return permanentQrUrl(qr, venue);
}
