import { AdminNav } from "@/components/AdminNav";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <main className="min-h-screen bg-paper text-ink"><AdminNav /><div className="mx-auto max-w-7xl p-4 md:p-8">{children}</div></main>;
}
