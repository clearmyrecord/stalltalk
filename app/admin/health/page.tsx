import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type CardProps = { label: string; status: "Connected" | "Failed"; detail?: string };

async function checkDatabase() {
  try { await prisma.$queryRaw`SELECT 1`; return { status: "Connected" as const }; }
  catch (error) { return { status: "Failed" as const, detail: error instanceof Error ? error.message : "Database check failed." }; }
}

async function checkPublishEngine() {
  try { await prisma.stalltalkAdSlot.count(); await prisma.stalltalkCampaignHistory.count(); return { status: "Connected" as const }; }
  catch (error) { return { status: "Failed" as const, detail: error instanceof Error ? error.message : "Publish tables unavailable." }; }
}

function checkOpenAi() {
  const key = Boolean(process.env.OPENAI_API_KEY);
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5";
  return { status: key ? "Connected" as const : "Failed" as const, detail: key ? `Model configured: ${model}` : "OPENAI_API_KEY missing." };
}

export default async function HealthPage() {
  const [database, publishEngine] = await Promise.all([checkDatabase(), checkPublishEngine()]);
  const openAi = checkOpenAi();
  return <section>
    <p className="font-black uppercase tracking-[.25em] text-stallRed">Health Dashboard</p>
    <h1 className="font-display text-7xl uppercase">System Health</h1>
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      <HealthCard label="OpenAI" {...openAi} />
      <HealthCard label="Database" {...database} />
      <HealthCard label="Publish Engine" {...publishEngine} />
    </div>
  </section>;
}

function HealthCard({ label, status, detail }: CardProps) {
  return <article className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal">
    <p className="font-black uppercase text-stallRed">{label}</p>
    <h2 className={`font-display text-5xl uppercase ${status === "Connected" ? "text-stallPurple" : "text-stallRed"}`}>{status}</h2>
    {detail ? <p className="break-words font-bold">{detail}</p> : null}
  </article>;
}
