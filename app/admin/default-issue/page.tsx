import { getDefaultGlobalIssue } from "@/lib/default-global-issue";
import { prisma } from "@/lib/prisma";
import { DefaultIssueEditor } from "./DefaultIssueEditor";

export default async function DefaultIssuePage() {
  const issue = await getDefaultGlobalIssue({ createIfMissing: true });
  const ads = await prisma.ad.findMany({ where: { status: "ACTIVE" }, orderBy: [{ businessName: "asc" }] });
  return <section className="grid gap-5"><div><h1 className="font-display text-7xl uppercase">Default Global Issue</h1><p className="font-bold">Edit the same default global issue rendered at /issue when no venue, QR, or issue parameter is provided. Schedule ISO is intentionally hidden.</p></div>{issue ? <DefaultIssueEditor issue={JSON.parse(JSON.stringify(issue))} ads={JSON.parse(JSON.stringify(ads))} /> : <p className="rounded-2xl border-4 border-ink bg-white p-5 font-black">Create editable default issue from current content failed because no publisher exists.</p>}</section>;
}
