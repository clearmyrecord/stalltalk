import { IssueForm } from "@/components/IssueForm";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export default async function NewIssuePage() {
  const [publishers, venues, restrooms, qrCodes, articles, ads] = await Promise.all([prisma.publisher.findMany(), prisma.venue.findMany(), prisma.restroom.findMany(), prisma.qrCode.findMany(), prisma.article.findMany(), prisma.ad.findMany({ orderBy: { businessName: "asc" } })]);
  return <section><h1 className="font-display text-7xl uppercase">New Issue</h1><IssueForm publishers={publishers} venues={venues} restrooms={restrooms} qrCodes={qrCodes} articles={articles} ads={ads} /></section>;
}
