import Link from "next/link";
import { notFound } from "next/navigation";
import { IssueForm } from "@/components/IssueForm";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EditIssuePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [issue, publishers, venues, restrooms, qrCodes, articles, ads] =
    await Promise.all([
      prisma.issue.findUnique({
        where: { id },
        include: {
          venue: true,
          qrCode: true,
          contentBlocks: {
            orderBy: {
              sortOrder: "asc"
            }
          },
          adSlots: true
        }
      }),
      prisma.publisher.findMany(),
      prisma.venue.findMany(),
      prisma.restroom.findMany(),
      prisma.qrCode.findMany(),
      prisma.article.findMany(),
      prisma.ad.findMany({
        orderBy: {
          businessName: "asc"
        }
      })
    ]);

  if (!issue) notFound();

  const previewHref = issue.venue
    ? `/issue/${issue.venue.slug}${issue.qrCode ? `?qr=${issue.qrCode.qrSlug}` : ""}`
    : `/issue${issue.qrCode ? `?qr=${issue.qrCode.qrSlug}` : ""}`;

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-7xl uppercase">Edit Issue</h1>

        <Link
          className="rounded-xl bg-stallYellow px-4 py-3 font-black uppercase"
          href={previewHref}
        >
          Preview Public Issue
        </Link>
      </div>

      <IssueForm
        publishers={publishers}
        venues={venues}
        restrooms={restrooms}
        qrCodes={qrCodes}
        articles={articles}
        ads={ads}
        issue={issue}
      />
    </section>
  );
}
