import Link from "next/link";
import type { ContentBlockType, Prisma } from "@prisma/client";
import { contentLabels } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PreviewIssue = Prisma.IssueGetPayload<{
  include: {
    publisher: true;
    venue: true;
    restroom: true;
    qrCode: true;
    contentBlocks: { include: { article: true } };
    adSlots: true;
  };
}>;

const AD_SLOT_COUNT = 8;

export default async function IssuePreviewPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const issue = await prisma.issue.findUnique({
    where: { id },
    include: {
      publisher: true,
      venue: true,
      restroom: true,
      qrCode: true,
      contentBlocks: {
        include: { article: true },
        orderBy: { sortOrder: "asc" }
      },
      adSlots: {
        orderBy: { slotNumber: "asc" }
      }
    }
  });

  if (!issue) {
    return (
      <main className="min-h-screen bg-paper px-6 py-10 text-ink">
        <section className="mx-auto max-w-3xl rounded-2xl border-4 border-ink bg-white p-8 shadow-brutal">
          <p className="text-sm font-black uppercase tracking-[.3em] text-stallRed">Preview unavailable</p>
          <h1 className="mt-2 font-display text-6xl uppercase">Issue not found</h1>
          <p className="mt-3 font-bold">No monthly issue exists for id <code>{id}</code>.</p>
          <Link className="mt-6 inline-block rounded-xl bg-ink px-4 py-3 font-black uppercase text-white" href="/admin/issues">
            Back to monthly issues
          </Link>
        </section>
      </main>
    );
  }

  return <IssuePreview issue={issue} />;
}

function IssuePreview({ issue }: { issue: PreviewIssue }) {
  let nextAdPlacement = 1;

  return (
    <main className="min-h-screen bg-paper px-4 py-8 text-ink md:px-8">
      <article className="mx-auto max-w-[760px] rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal md:p-8">
        <header className="border-b-4 border-ink pb-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[.3em] text-stallRed">Admin Preview</p>
              <h1 className="font-display text-6xl uppercase leading-none md:text-7xl">{issue.title}</h1>
            </div>
            <Link className="rounded-xl bg-ink px-4 py-3 font-black uppercase text-white" href={`/admin/issues/${issue.id}/edit`}>
              Edit Issue
            </Link>
          </div>
          <dl className="mt-4 grid gap-2 text-sm font-black uppercase md:grid-cols-2">
            <PreviewMeta label="Issue" value={`#${issue.issueNumber} · ${issue.month} ${issue.year}`} />
            <PreviewMeta label="Publisher" value={issue.publisher.name} />
            <PreviewMeta label="Venue" value={issue.venue?.name || "Global Issue"} />
            <PreviewMeta label="QR" value={issue.qrCode?.qrSlug || "None"} />
          </dl>
        </header>

        <section className="mt-6 grid justify-items-center gap-5" aria-label="Issue content preview">
          {issue.contentBlocks.map((block) => {
            const isAdBlock = block.type === "ADVERTISEMENT" || block.type === "SPONSOR_SLOT";
            if (isAdBlock) {
              return <AdPlaceholder key={block.id} placement={nextAdPlacement++} />;
            }

            return (
              <section key={block.id} className="w-full rounded-2xl border-4 border-ink bg-paper p-5">
                <p className="text-xs font-black uppercase tracking-[.25em] text-stallPurple">{labelFor(block.type)}</p>
                <h2 className="mt-1 font-display text-4xl uppercase leading-none">{block.title}</h2>
                {block.imageUrl ? <img className="mt-4 max-h-72 w-full rounded-xl border-2 border-ink object-cover" src={block.imageUrl} alt="" /> : null}
                <div className="mt-4 space-y-3 font-bold leading-relaxed">
                  {block.body.split("\n\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
              </section>
            );
          })}

          {Array.from({ length: Math.max(0, AD_SLOT_COUNT - nextAdPlacement + 1) }, (_, index) => (
            <AdPlaceholder key={`remaining-ad-${nextAdPlacement + index}`} placement={nextAdPlacement + index} />
          ))}
        </section>
      </article>
    </main>
  );
}

function PreviewMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-stallYellow px-3 py-2">
      <dt className="text-[10px] tracking-[.25em] text-stallRed">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function AdPlaceholder({ placement }: { placement: number }) {
  return (
    <div
      className="ad-slot flex items-center justify-center rounded-xl border-4 border-dashed border-ink bg-white text-sm font-black uppercase tracking-[.2em] text-stallPurple"
      data-ad-slot="content-ad"
      data-placement={placement}
      style={{ width: 320, height: 100 }}
    >
      Content Ad {placement}
    </div>
  );
}

function labelFor(type: ContentBlockType) {
  return contentLabels[type] || type.replaceAll("_", " ");
}
