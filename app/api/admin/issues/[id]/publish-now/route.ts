import { NextResponse } from "next/server"; import { requireAdmin } from "@/lib/auth"; import { publishIssueNow } from "@/lib/issue-scheduling";
export async function POST(_: Request,{params}:{params:Promise<{id:string}>}){await requireAdmin(); const {id}=await params; return NextResponse.json(await publishIssueNow(id));}
