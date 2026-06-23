import { prisma } from "@/lib/prisma";
export const DEFAULT_ISSUE_UNAVAILABLE_MESSAGE = "Default issue unavailable. Using temporary fallback.";

function currentDefaultIssueSeed() {
  const now = new Date();
  return {
    slug: "default-public-issue",
    title: "Potty Favor Global Issue",
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    status: "PUBLISHED",
    publishedAt: now,
    issueJson: {
      slug: "default-public-issue",
      title: "Potty Favor Global Issue",
      status: "PUBLISHED",
    },
  };
}

export function createFallbackDefaultIssue() {
  const seed = currentDefaultIssueSeed();
  const now = new Date();
  return {
    id: seed.slug,
    ...seed,
    description: null,
    createdAt: now,
    updatedAt: now,
    __fallback: true,
    __message: DEFAULT_ISSUE_UNAVAILABLE_MESSAGE,
  };
}

export async function getOrCreateDefaultIssue() {
  const existing = await prisma.defaultIssue.findFirst({ orderBy: { updatedAt: "desc" } });
  if (existing) return existing;

  const seed = currentDefaultIssueSeed();
  return prisma.defaultIssue.create({
    data: {
      id: seed.slug,
      slug: seed.slug,
      title: seed.title,
      month: seed.month,
      year: seed.year,
      status: seed.status,
      publishedAt: seed.publishedAt,
      issueJson: seed.issueJson as any,
    },
  });
}
