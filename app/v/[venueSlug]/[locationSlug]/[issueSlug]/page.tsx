import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page({ params }: any) {
  const { issueSlug } = await params;
  redirect(`/issue/${encodeURIComponent(issueSlug)}`);
}
