import SignupForm from "./signup-form";
export const dynamic = "force-dynamic";
export default async function SignupPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) { const params = await searchParams; return <main className="min-h-screen bg-paper p-6 text-ink"><SignupForm initialType={params.type === "venue" ? "venue" : "advertiser"} /></main>; }
