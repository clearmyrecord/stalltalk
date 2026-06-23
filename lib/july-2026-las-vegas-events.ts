import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const JULY_START = new Date("2026-07-01T00:00:00-07:00");
const AUGUST_START = new Date("2026-08-01T00:00:00-07:00");

type Source = { name: string; url: string; category: string };
type Candidate = {
  title: string;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  venue: string;
  address: string | null;
  description: string;
  category: string;
  priceLabel: string;
  sourceUrl: string;
  imageUrl: string | null;
  sourceName: string;
};

const sources: Source[] = [
  { name: "City of Las Vegas", url: "https://www.lasvegasnevada.gov/Events", category: "City" },
  { name: "Clark County", url: "https://www.clarkcountynv.gov/government/departments/parks___recreation/events.php", category: "Parks & Recreation" },
  { name: "Las Vegas Weekly", url: "https://lasvegasweekly.com/events/", category: "Community calendar" },
  { name: "Eventbrite", url: "https://www.eventbrite.com/d/nv--las-vegas/community--events/", category: "Community" },
  { name: "Downtown Las Vegas", url: "https://downtown.vegas/events/", category: "Downtown" },
  { name: "Las Vegas-Clark County Library District", url: "https://thelibrarydistrict.org/events/", category: "Library" },
];

export async function importJuly2026LasVegasEvents() {
  const diagnostics = { eventsSearched: 0, eventsImported: 0, duplicatesSkipped: 0, eventsNeedingReview: 0, sourceFailures: [] as Array<{ sourceName: string; url: string; error: string }> };
  const importedIds: string[] = [];
  for (const source of sources) {
    try {
      const response = await fetch(source.url, { headers: { "user-agent": "PottyFavorAdminEventImporter/1.0" }, next: { revalidate: 0 } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      const candidates = extractEvents(html, source);
      diagnostics.eventsSearched += candidates.length;
      for (const event of candidates) {
        const duplicate = await prisma.event.findFirst({ where: { title: event.title, date: event.date, venue: event.venue } });
        if (duplicate) { diagnostics.duplicatesSkipped++; continue; }
        const created = await prisma.event.create({ data: { ...event, status: "PENDING_REVIEW", issueMonth: "July", issueYear: 2026, importedAt: new Date() } as Prisma.EventUncheckedCreateInput });
        importedIds.push(created.id);
        diagnostics.eventsImported++;
      }
    } catch (error) {
      diagnostics.sourceFailures.push({ sourceName: source.name, url: source.url, error: error instanceof Error ? error.message : String(error) });
    }
  }
  diagnostics.eventsNeedingReview = await prisma.event.count({ where: { issueMonth: "July", issueYear: 2026, status: "PENDING_REVIEW" } });
  const issue = await ensureJulyIssue();
  await prisma.event.updateMany({ where: { id: { in: importedIds }, status: "APPROVED" }, data: { issueId: issue.id } });
  return { issueId: issue.id, diagnostics, message: diagnostics.eventsImported ? undefined : "No verified July 2026 Las Vegas community events found yet." };
}

async function ensureJulyIssue() {
  const existing = await prisma.issue.findFirst({ where: { month: "July", year: 2026 }, orderBy: { updatedAt: "desc" } });
  if (existing) return existing;
  const publisher = await prisma.publisher.findFirst({ orderBy: { createdAt: "asc" } });
  if (!publisher) throw new Error("No publisher exists for July 2026 issue creation.");
  return prisma.issue.create({ data: { publisherId: publisher.id, title: "Potty Favor July 2026", slug: "potty-favor-july-2026", month: "July", year: 2026, issueNumber: 202607, status: "DRAFT", isScheduled: true, scheduledPublishAt: new Date("2026-07-01T08:00:00-07:00") } });
}

function extractEvents(html: string, source: Source): Candidate[] {
  const jsonLd = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  return jsonLd.flatMap((match) => normalizeJsonLd(match[1], source)).filter(isJulyLasVegasEvent);
}

function normalizeJsonLd(raw: string, source: Source): Candidate[] {
  try {
    const parsed = JSON.parse(raw.replace(/&quot;/g, '"'));
    const nodes = Array.isArray(parsed) ? parsed : parsed["@graph"] || [parsed];
    return nodes.filter((node: any) => node?.["@type"] === "Event" || (Array.isArray(node?.["@type"]) && node["@type"].includes("Event"))).map((node: any) => {
      const start = new Date(node.startDate);
      const end = node.endDate ? new Date(node.endDate) : null;
      const location = node.location || {};
      const address = typeof location.address === "string" ? location.address : [location.address?.streetAddress, location.address?.addressLocality, location.address?.addressRegion, location.address?.postalCode].filter(Boolean).join(", ");
      const offers = Array.isArray(node.offers) ? node.offers[0] : node.offers;
      return { title: String(node.name || "").trim(), date: start, startTime: time(start), endTime: end ? time(end) : null, venue: String(location.name || "Las Vegas").trim(), address: address || null, description: String(node.description || "").replace(/<[^>]+>/g, " ").trim(), category: source.category, priceLabel: offers?.price === 0 || /free/i.test(String(offers?.name || offers?.description || "")) ? "Free" : offers?.price ? `$${offers.price}` : "See source", sourceUrl: String(node.url || source.url), imageUrl: Array.isArray(node.image) ? node.image[0] : node.image || null, sourceName: source.name };
    });
  } catch { return []; }
}

function isJulyLasVegasEvent(event: Candidate) {
  return Boolean(event.title && event.sourceUrl && event.date >= JULY_START && event.date < AUGUST_START && /las vegas|clark county|downtown/i.test(`${event.venue} ${event.address || ""} ${event.sourceName}`));
}

function time(date: Date) { return Number.isNaN(date.valueOf()) ? null : date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Los_Angeles" }); }
