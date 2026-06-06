import { AdminNav } from "@/components/AdminNav";
import { requireUser } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["ADMIN"]);
  return <main className="min-h-screen bg-paper text-ink"><AdminNav user={user} /><div className="mx-auto max-w-7xl p-4 md:p-8">{children}</div></main>;
}
