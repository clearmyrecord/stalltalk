import { redirect } from "next/navigation";
import { createVenueContentDraft, createVenueMediaAsset, signOutAction } from "@/lib/actions";
import { authEnvStatus, currentUser } from "@/lib/auth";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const metricTypes = [
  ["QR scans", "SCAN"],
  ["Issue views", "ISSUE_VIEW"],
  ["Ad impressions", "AD_IMPRESSION"],
  ["Ad clicks", "AD_CLICK"],
  ["Coupon clicks", "COUPON_CLICK"],
  ["Website visits", "WEBSITE_VISIT"]
] as const;

function badge(status: string) {
  return `rounded-full border-2 border-ink px-2 py-1 text-xs font-black uppercase ${status === "PUBLISHED" || status === "APPROVED" ? "bg-green-100" : status === "REJECTED" ? "bg-stallRed text-white" : "bg-stallYellow"}`;
}

function startFor(filter: string) {
  const now = new Date();
  if (filter === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filter === "7") return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (filter === "30") return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default async function VenuePortalPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const params = await searchParams;
  const range = params.range || "30";
  const auth = authEnvStatus();
  const user = await currentUser();
  if (auth.isConfigured && (!user || (user.role !== "VENUE_MANAGER" && user.role !== "VENUE" && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN"))) redirect("/signin?error=role");
  const where = (user?.role === "VENUE_MANAGER" || user?.role === "VENUE") && user.venueId ? { id: user.venueId } : {};
  try {
const venues = await prisma.venue.findMany({
  where,
  include: {
    restrooms: true,
    qrCodes: true,
    issues: {
      orderBy: [
        { year: "desc" },
        { issueNumber: "desc" }
      ],
      take: 2
    },
    events: {
      where: {
        createdAt: {
          gte: startFor(range)
        }
      }
    },
    mediaAssets: {
      orderBy: {
        createdAt: "desc"
      }
    },
    toiletLocations: {
      include: {
        restroom: true,
        qrCode: true
      }
    },
    venueContentDrafts: {
      orderBy: {
        createdAt: "desc"
      }
    },
    adSlotInventories: {
      include: {
        campaigns: {
          include: {
            advertiser: true
          },
          where: {
            OR: [
              { status: "ACTIVE" },
              {
                status: "PAID",
                approvalStatus: "APPROVED"
              }
            ]
          }
        },
        restroom: true,
        qrCode: true
      }
    }
  },
  orderBy: {
    name: "asc"
  }
});
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "");
    if (!/does not exist|P2021|VenueContentDraft|AdCampaign|VenueMediaAsset/i.test(message)) throw error;
    return <main className="min-h-screen bg-paper p-8 text-ink"><h1 className="font-display text-7xl uppercase">Venue Dashboard</h1><p className="mt-4 rounded-2xl border-4 border-ink bg-stallYellow p-5 font-black shadow-brutal">Run Prisma migrations to enable the venue management portal tables.</p></main>;
  }
}
