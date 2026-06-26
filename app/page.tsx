import { StaticIssuePage, requestFromHeaders } from "./issue/static-issue-page";

export const dynamic = "force-dynamic";

export default async function Home() {
  const request = await requestFromHeaders("/");
  return <StaticIssuePage request={request} />;
}
