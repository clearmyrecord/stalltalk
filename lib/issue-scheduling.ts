import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { saveDefaultIssue } from "@/lib/default-issue";

const includeIssue = { contentBlocks: { orderBy: { sortOrder: "asc" } }, adSlots: { orderBy: { slotNumber: "asc" } }, venue: true } as const;

export async function publishScheduledIssues(now = new Date(), db: any = prisma) {
  const due = await db.issue.findMany({ where: { isScheduled: true, isPublished: false, isArchived: false, scheduledPublishAt: { lte: now } }, include: includeIssue });
  const published: string[] = [], archived: string[] = [], skipped: string[] = [];
  for (const issue of due) {
    try {
      const previous = await db.issue.findFirst({ where: { id: { not: issue.id }, venueId: issue.venueId, isPublished: true, isArchived: false }, orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }] });
      await db.$transaction(async (tx: any) => {
        if (issue.archivePreviousOnPublish) {
          const res = await tx.issue.updateMany({ where: { id: { not: issue.id }, venueId: issue.venueId, isPublished: true, isArchived: false }, data: { isArchived: true, status: "ARCHIVED", archivedAt: now } });
          if (previous && res.count) archived.push(previous.id);
        }
        await tx.issue.update({ where: { id: issue.id }, data: { isPublished: true, isScheduled: false, isArchived: false, status: "PUBLISHED", publishedAt: now, archivedAt: null } });
      });
      if (issue.replaceDefaultOnPublish && !issue.venueId) {
        await saveDefaultIssue({ id: "global", title: issue.title, slug: issue.slug || `${issue.month.toLowerCase()}-${issue.year}`, month: issue.month, year: issue.year, status: "PUBLISHED", contentBlocks: issue.contentBlocks, adSlots: issue.adSlots });
      }
      published.push(issue.id);
    } catch { skipped.push(issue.id); }
  }
  revalidatePath("/issue"); revalidatePath("/admin/schedule"); revalidatePath("/admin/issues");
  return { now: now.toISOString(), published, archived, skipped, totalDue: due.length };
}

export async function publishIssueNow(id: string) {
  await prisma.issue.update({ where: { id }, data: { isScheduled: true, scheduledPublishAt: new Date() } });
  return publishScheduledIssues(new Date());
}
