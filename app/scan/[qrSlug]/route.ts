import { GET as scan } from "@/app/api/qr/[slug]/scan/route";
export async function GET(request: Request, { params }: { params: Promise<{ qrSlug: string }> }) {
  const { qrSlug } = await params;
  return scan(request, { params: Promise.resolve({ slug: qrSlug }) });
}
