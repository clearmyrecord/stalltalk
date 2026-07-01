import { slugify } from "./format";
import { publicBaseUrl } from "./qr";

export function locationSlug(name?: string | null, fallback?: string | null) {
  return slugify(name || fallback || "location");
}

export function buildIssueSlug({ venueSlug, locationSlug: loc, month, year }: { venueSlug?: string | null; locationSlug?: string | null; month: string; year: number }) {
  return slugify(`${venueSlug ? `${venueSlug}-` : ""}${loc ? `${loc}-` : ""}${month}-${year}`);
}

export function issuePublicPath(issue: { slug?: string | null; venue?: { slug: string } | null; restroom?: { slug?: string | null; name?: string | null } | null; venueId?: string | null; restroomId?: string | null }) {
  // Historical/shareable issue URLs are always issue routes. Printed QR
  // stickers must use permanent /v routes instead, so never include an issue
  // slug in a venue QR path here.
  return issue.slug ? `/issue/${issue.slug}` : "/issue";
}

export function issuePublicUrl(issue: Parameters<typeof issuePublicPath>[0]) {
  return `${publicBaseUrl()}${issuePublicPath(issue)}`;
}

export function qrDestinationPath(args: { venueSlug?: string | null; locationSlug?: string | null; issueSlug?: string | null; type?: string | null }) {
  if (args.locationSlug && args.venueSlug) return `/v/${args.venueSlug}/${args.locationSlug}`;
  if (args.venueSlug) return `/v/${args.venueSlug}`;
  if (args.issueSlug && args.type === "ISSUE") return `/issue/${args.issueSlug}`;
  return "/issue";
}
