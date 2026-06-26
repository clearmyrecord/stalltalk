import { StaticIssuePage } from "./static-issue-page";

export const dynamic = "force-static";

type IssueQueryPageProps = {
  searchParams?: Promise<{ qr?: string; previewIssueId?: string }>;
};

export default function IssueQueryPage(_props?: IssueQueryPageProps) {
  return <StaticIssuePage />;
}
