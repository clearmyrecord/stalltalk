import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { saveDefaultIssue } from "@/lib/default-issue";
import { slugify } from "@/lib/format";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function combinePublishDateTime(date?: string | null, time?: string | null) {
  if (!date) return null;
  const value = `${date}T${time || "00:00"}:00`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function nextMonthYear(month: string, year: number) {
  const idx = Math.max(0, MONTHS.findIndex((m) => m.toLowerCase() === month.toLowerCase()));
  const next = (idx + 1) % 12;
  return { month: MONTHS[next], year: next === 0 ? year + 1 : year };
}

export function issueSlug(venueSlug: string | null | undefined, month: string, year: number) {
  return slugify(`${venueSlug ? `${venueSlug}-` : ""}${month}-${year}`);
}

export async function issueToDefaultPayload(issueId: string, tx: any = prisma) {
  const issue = await tx.issue.findUnique({
    where: { id: issueId },
    include: { contentBlocks: { orderBy: { sortOrder: "asc" } }, adSlots: { include: { ad: true }, orderBy: { slotNumber: "asc" } } },
  });
  if (!issue) throw new Error("Issue not found.");
  return {
    id: "global",
    sourceIssueId: issue.id,
    title: issue.title,
    slug: issue.slug || issueSlug(null, issue.month, issue.year),
    month: issue.month,
    year: issue.year,
    status: "PUBLISHED",
    contentBlocks: issue.contentBlocks,
    adSlots: issue.adSlots,
  };
}

export async function publishDueIssues(now = new Date()) {
  const due = await prisma.issue.findMany({
    where: { isScheduled: true, isPublished: false, isArchived: false, scheduledPublishAt: { lte: now } },
    include: { venue: true },
    orderBy: { scheduledPublishAt: "asc" },
  });
  const summary: { published: string[]; archived: string[]; skipped: Array<{ id: string; reason: string }> } = { published: [], archived: [], skipped: [] };
  for (const issue of due) {
    try {
      const previous = await prisma.issue.findFirst({
        where: { id: { not: issue.id }, venueId: issue.venueId, isPublished: true, isArchived: false },
        orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      });
      await prisma.$transaction(async (tx) => {
        if (issue.archivePreviousOnPublish && previous) {
          await tx.issue.update({ where: { id: previous.id }, data: { status: "ARCHIVED", isArchived: true, archivedAt: now } });
          summary.archived.push(previous.id);
        }
        await tx.issue.update({ where: { id: issue.id }, data: { status: "PUBLISHED", isPublished: true, isScheduled: false, isArchived: false, publishedAt: issue.publishedAt || now } });
      });
      if (issue.replaceDefaultOnPublish) await saveDefaultIssue(await issueToDefaultPayload(issue.id));
      summary.published.push(issue.id);
      revalidatePath("/issue");
      if (issue.venue?.slug) revalidatePath(`/issue/${issue.venue.slug}`);
      revalidatePath("/admin/schedule");
      revalidatePath("/admin/issues");
    } catch (error) {
      summary.skipped.push({ id: issue.id, reason: error instanceof Error ? error.message : String(error) });
    }
  }
  return { now: now.toISOString(), ...summary };
}
