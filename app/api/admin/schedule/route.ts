import { NextResponse } from "next/server"; import { requireAdmin } from "@/lib/auth"; import { prisma } from "@/lib/prisma";
export async function GET(){await requireAdmin(); const issues=await prisma.issue.findMany({include:{venue:true},orderBy:[{year:"desc"},{issueNumber:"desc"}]}); return NextResponse.json({issues});}
