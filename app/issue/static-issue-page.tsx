import { headers } from "next/headers";
import publishedIssue from "@/data/published-issue.json";
import publishedAds from "@/data/published-ads.json";
import {
  MissionCard,
  PublicationFooter,
  PublicationHeader,
} from "@/components/PublicationIssueChrome";
import {
  getPublicationAds,
  PublicationAdFallback,
  StaticPublicationBlocks,
} from "@/components/StaticPublicationBlocks";
import { DEFAULT_PUBLIC_ISSUE_ID } from "@/lib/default-public-issue";

export async function requestFromHeaders(path: string) {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  return new Request(`${proto}://${host}${path}`, { headers: h });
}

export function StaticIssuePage({
  qrCode,
}: { qrCode?: string; request?: Request } = {}) {
  const ads = getPublicationAds(
    publishedAds.filter((ad) => ad.active !== false),
  );

  return (
    <main className="public-page">
      <article
        className="publication"
        aria-label="Potty Favor monthly issue"
        data-issue-id={DEFAULT_PUBLIC_ISSUE_ID}
      >
        <PublicationHeader monthYear={publishedIssue.issueMonthYear} />
        <section className="print-grid">
          <MissionCard missionText={publishedIssue.missionText} />
          <PublicationAdFallback
            ad={ads[0]}
            slotNumber={1}
            qrCode={qrCode}
            primary
          />
          <StaticPublicationBlocks ads={ads} qrCode={qrCode} />
        </section>
        <PublicationFooter />
      </article>
    </main>
  );
}
