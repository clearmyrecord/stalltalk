import { publicBaseUrl } from "@/lib/qr";

const PERMANENT_Q_ROUTE = /^\/q\/[A-Za-z0-9_-]+$/;

export function validatedPermanentQrAssetUrl(route: string | null | undefined) {
  if (!route) return null;
  const base = publicBaseUrl();
  try {
    const parsed = route.startsWith("/") ? new URL(route, base) : new URL(route);
    const baseUrl = new URL(base);
    if (parsed.origin !== baseUrl.origin) return null;
    if (!PERMANENT_Q_ROUTE.test(parsed.pathname)) return null;
    if (parsed.search || parsed.hash) return null;
    return `${base}${parsed.pathname}`;
  } catch {
    return null;
  }
}

export function qrAssetDownloadPath(qrSlug: string, route?: string | null, format = "png") {
  const params = new URLSearchParams({ format });
  if (route) params.set("route", route);
  return `/api/qr/${encodeURIComponent(qrSlug)}/asset?${params.toString()}`;
}
