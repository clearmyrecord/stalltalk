import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { generateAiAdConcepts } from "@/lib/ai-ad-buyer";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADVERTISER" && user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const brief = await request.json();
  if (!String(brief.businessName || "").trim() || !String(brief.goal || "").trim() || !String(brief.prompt || "").trim()) {
    return NextResponse.json({ error: "Business name, campaign goal, and prompt are required." }, { status: 400 });
  }
  const concepts = await generateAiAdConcepts(brief);
  return NextResponse.json({ concepts });
}
