import { NextResponse } from "next/server";
import { currentUser, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/passwords";
import { validateNewPassword } from "@/lib/password-reset";

function value(form: FormData | Record<string, unknown>, key: string) {
  return form instanceof FormData ? String(form.get(key) || "") : String(form[key] || "");
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  const form = request.headers.get("content-type")?.includes("application/json") ? await request.json() : await request.formData();
  const currentPassword = value(form, "currentPassword");
  const newPassword = value(form, "newPassword");
  const confirmPassword = value(form, "confirmPassword");
  if (newPassword !== confirmPassword) return NextResponse.json({ ok: false, error: "New passwords do not match." }, { status: 400 });
  const passwordError = validateNewPassword(newPassword);
  if (passwordError) return NextResponse.json({ ok: false, error: passwordError }, { status: 400 });
  if (!verifyPassword(currentPassword, user.passwordHash)) return NextResponse.json({ ok: false, error: "Current password is incorrect." }, { status: 400 });
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(newPassword) } });
  return NextResponse.json({ ok: true });
}
