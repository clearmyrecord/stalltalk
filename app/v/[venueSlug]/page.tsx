import VenueIssuePage from "@/app/issue/[slug]/page";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: any) {
  const { venueSlug } = await params;
  const venue = await prisma.venue.findUnique({ where: { slug: venueSlug } });
  const qr = venue
    ? await prisma.qrCode.findFirst({
        where: { venueId: venue.id, qrType: "VENUE", restroomId: null },
        select: { qrSlug: true, issueId: true },
      })
    : null;

  return (
    <VenueIssuePage
      params={Promise.resolve({ venueSlug })}
      searchParams={Promise.resolve({ ...(await searchParams), qr: qr?.qrSlug, previewIssueId: qr?.issueId })}
    />
  );
}
