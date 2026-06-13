import { AdStudioAgency } from "@/components/AdStudioAgency";
import { createAd } from "@/lib/actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
type PublisherRecord = { id: string; name: string };
type AdvertiserRecord = { id: string; name: string };
type VenueRecord = { id: string; name: string; city: string; state: string };
type RestroomRecord = { id: string; name: string; venue: { name: string } };
type IssueRecord = { id: string; title: string; status: string; venue: { name: string } | null };
type AdRecord = { id: string; businessName: string; title: string; offer: string; ctaText: string; couponCode: string | null; createdAt: Date };

export default async function NewAdPage() {
  const [publishers, advertisers, venues, restrooms, issues, recentCampaigns] = await Promise.all([
    prisma.publisher.findMany({ orderBy: { name: "asc" } }),
    prisma.advertiser.findMany({ orderBy: { name: "asc" } }),
    prisma.venue.findMany({ orderBy: { name: "asc" } }),
    prisma.restroom.findMany({ include: { venue: true }, orderBy: { name: "asc" } }),
    prisma.issue.findMany({ include: { venue: true }, orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.ad.findMany({ orderBy: { createdAt: "desc" }, take: 8 })
  ]);

  return (
    <AdStudioAgency
      createAd={createAd}
      publishers={(publishers as PublisherRecord[]).map((publisher) => ({ id: publisher.id, name: publisher.name }))}
      advertisers={(advertisers as AdvertiserRecord[]).map((advertiser) => ({ id: advertiser.id, name: advertiser.name }))}
      venues={(venues as VenueRecord[]).map((venue) => ({ id: venue.id, name: venue.name, city: venue.city, state: venue.state }))}
      restrooms={(restrooms as RestroomRecord[]).map((restroom) => ({ id: restroom.id, name: restroom.name, venueName: restroom.venue.name }))}
      issues={(issues as IssueRecord[]).map((issue) => ({ id: issue.id, title: issue.title, venueName: issue.venue?.name || "Global Issue", status: issue.status }))}
      recentCampaigns={(recentCampaigns as AdRecord[]).map((ad) => ({ id: ad.id, businessName: ad.businessName, title: ad.title, offer: ad.offer, ctaText: ad.ctaText, couponCode: ad.couponCode, createdAt: ad.createdAt.toISOString() }))}
    />
  );
}
