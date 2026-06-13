import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function prismaStatus() {
  try { await prisma.$queryRaw`SELECT 1`; return "Connected"; }
  catch { return "Failed"; }
}

export default async function DeploymentChecklistPage() {
  const prismaCheck = await prismaStatus();
  const databaseUrl = process.env.DATABASE_URL ? "Detected" : "Missing";
  const openAiKey = process.env.OPENAI_API_KEY ? "Detected" : "Missing";
  const authSecret = process.env.AUTH_SECRET ? "Detected" : "Missing";
  const vercelEnv = process.env.VERCEL_ENV || "Local / unknown";
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5";
  const openAiReady = process.env.OPENAI_API_KEY ? "Ready to test in Settings" : "Failed: OPENAI_API_KEY missing";
  const items = [
    ["DATABASE_URL status", databaseUrl],
    ["AUTH_SECRET status", authSecret],
    ["Vercel environment", vercelEnv],
    ["Vercel build command", "npm run vercel-build"],
    ["Migration command", "prisma migrate deploy before next build"],
    ["OPENAI_API_KEY status", openAiKey],
    ["Prisma status", prismaCheck],
    ["OpenAI image generation status", openAiReady],
    ["OpenAI image model", model],
    ["Vercel deployment", process.env.VERCEL ? "Detected" : "Local / unknown"]
  ];
  return <section>
    <p className="font-black uppercase tracking-[.25em] text-stallRed">Deployment Checklist</p>
    <h1 className="font-display text-7xl uppercase">Production Readiness</h1>
    <div className="mt-6 grid gap-3">
      {items.map(([label, value]) => <article key={label} className="rounded-2xl border-4 border-ink bg-white p-4 shadow-brutal md:flex md:items-center md:justify-between">
        <h2 className="font-black uppercase">{label}</h2>
        <p className="font-display text-3xl uppercase text-stallPurple">{value}</p>
      </article>)}
    </div>
  </section>;
}
