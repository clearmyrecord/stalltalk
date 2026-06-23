import QRCode from "qrcode";

const QR_OPTIONS = {
  errorCorrectionLevel: "H" as const,
  margin: 4,
  color: { dark: "#000000", light: "#ffffff" },
};

export const QR_EXPORT_SIZE = 1024;
export const QR_STICKER_SIZE = 360;
export const QR_QUIET_ZONE_MODULES = 4;

export function publicBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || "https://pottyfavor.com";
  const withProtocol = configured.startsWith("http://") || configured.startsWith("https://") ? configured : `https://${configured}`;
  return withProtocol.replace(/\/$/, "");
}

export function qrIssueUrl(qrCodeId: string) {
  return `${publicBaseUrl()}/scan/${encodeURIComponent(qrCodeId)}`;
}

export function normalizeQrUrl(qrCodeId: string, storedUrl?: string | null) {
  if (!storedUrl) return qrIssueUrl(qrCodeId);
  try {
    const parsed = new URL(storedUrl);
    if (parsed.protocol === "https:" && !parsed.hostname.includes("localhost") && !parsed.pathname.startsWith("/admin")) return parsed.toString();
  } catch {
    // Fall through to the scanner-safe public issue URL.
  }
  return qrIssueUrl(qrCodeId);
}

export function qrWarnings(encodedUrl: string) {
  const warnings: string[] = [];
  if (!encodedUrl) warnings.push("Encoded URL missing");
  try {
    const parsed = new URL(encodedUrl);
    if (parsed.protocol !== "https:") warnings.push("Encoded URL is not HTTPS");
    if (parsed.hostname.includes("localhost")) warnings.push("Encoded URL points to localhost");
    if (parsed.pathname.startsWith("/admin")) warnings.push("Encoded URL points to admin");
    if (encodedUrl.includes("undefined")) warnings.push("Encoded URL contains undefined");
  } catch {
    warnings.push("Encoded URL is invalid");
  }
  if (QR_EXPORT_SIZE < 1024) warnings.push("QR PNG export is below 1024px");
  if (QR_QUIET_ZONE_MODULES < 4) warnings.push("QR quiet zone is below 4 modules");
  return warnings;
}

export function qrSvg(value: string, size = QR_EXPORT_SIZE) {
  const qr = QRCode.create(value, { errorCorrectionLevel: QR_OPTIONS.errorCorrectionLevel });
  const moduleCount = qr.modules.size;
  const fullModuleCount = moduleCount + QR_QUIET_ZONE_MODULES * 2;
  const moduleSize = size / fullModuleCount;
  const rects: string[] = [];
  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (qr.modules.get(row, col)) {
        rects.push(`<rect x='${(col + QR_QUIET_ZONE_MODULES) * moduleSize}' y='${(row + QR_QUIET_ZONE_MODULES) * moduleSize}' width='${moduleSize}' height='${moduleSize}'/>`);
      }
    }
  }
  return `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}' shape-rendering='crispEdges'><rect width='100%' height='100%' fill='#ffffff'/><g fill='#000000'>${rects.join("")}</g></svg>`;
}

export function qrSvgDataUrl(value: string, size = QR_EXPORT_SIZE) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(qrSvg(value, size))}`;
}

export async function qrPngBuffer(value: string, size = QR_EXPORT_SIZE) {
  return QRCode.toBuffer(value, { ...QR_OPTIONS, type: "png", width: size, scale: 16 });
}

export function qrStickerSvg({ value, venueName, shortUrl, callToAction, template }: { value: string; venueName: string; shortUrl: string; callToAction: string; template: string }) {
  const dimensions = template === "TABLE_TENT" ? { w: 720, h: 540 } : template === "WINDOW_STICKER" ? { w: 540, h: 540 } : { w: 480, h: 720 };
  const qrSize = Math.min(QR_STICKER_SIZE, dimensions.w - 96, dimensions.h - 260);
  const qrX = (dimensions.w - qrSize) / 2;
  const qrY = template === "WINDOW_STICKER" ? 125 : 170;
  const qrMarkup = qrSvg(value, qrSize).replace(/<svg[^>]*>/, "").replace("</svg>", "");
  return `<svg xmlns='http://www.w3.org/2000/svg' width='${dimensions.w}' height='${dimensions.h}' viewBox='0 0 ${dimensions.w} ${dimensions.h}'><rect width='100%' height='100%' rx='28' fill='#fff8df'/><rect x='18' y='18' width='${dimensions.w - 36}' height='${dimensions.h - 36}' rx='22' fill='none' stroke='#08070a' stroke-width='10'/><text x='50%' y='70' text-anchor='middle' font-family='Arial Black, Arial' font-size='40' fill='#08070a'>POTTY FAVOR</text><text x='50%' y='115' text-anchor='middle' font-family='Arial' font-size='22' font-weight='900' fill='#08070a'>${escapeXml(venueName)}</text><rect x='${qrX - 12}' y='${qrY - 12}' width='${qrSize + 24}' height='${qrSize + 24}' fill='#ffffff'/><g transform='translate(${qrX} ${qrY})'>${qrMarkup}</g><text x='50%' y='${qrY + qrSize + 60}' text-anchor='middle' font-family='Arial Black, Arial' font-size='28' fill='#08070a'>${escapeXml(callToAction)}</text><text x='50%' y='${qrY + qrSize + 98}' text-anchor='middle' font-family='Arial' font-size='18' font-weight='900' fill='#08070a'>${escapeXml(shortUrl)}</text><text x='50%' y='${dimensions.h - 42}' text-anchor='middle' font-family='Arial' font-size='16' fill='#08070a'>${escapeXml(template.replaceAll("_", " "))}</text></svg>`;
}

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[char] || char));
}
