import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getDefaultIssue, saveDefaultIssue } from "@/lib/default-issue";

export async function GET() {
  try {
    const issue = await getDefaultIssue({ createIfMissing: true });
    return NextResponse.json({ ok: true, issue });
  } catch (error) {
    console.error("Default issue API GET failed", error);
    return NextResponse.json({ ok: false, error: "Default issue unavailable" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  await requireAdmin();
  try {
    const body = await request.json();
    const issue = await saveDefaultIssue(body.issue || body);
    revalidatePath("/issue");
    revalidatePath("/");
    revalidatePath("/admin/default-issue");
    revalidatePath("/admin/issue-builder");
    return NextResponse.json({ ok: true, issue });
  } catch (error) {
    console.error("Default issue API PUT failed", error);
    return NextResponse.json({ ok: false, error: "Default issue save failed" }, { status: 500 });
  }
}
