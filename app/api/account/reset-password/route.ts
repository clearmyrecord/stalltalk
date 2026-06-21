import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";
import { hashPasswordResetToken, validateNewPassword } from "@/lib/password-reset";

function value(form: FormData | Record<string, unknown>, key: string) {
  return form instanceof FormData ? String(form.get(key) || "") : String(form[key] || "");
}

export async function POST(request: Request) {
  const form = request.headers.get("content-type")?.includes("application/json") ? await request.json() : await request.formData();
  const token = value(form, "token");
  const newPassword = value(form, "newPassword");
  const confirmPassword = value(form, "confirmPassword");
  if (!token) return NextResponse.json({ ok: false, error: "Reset link is invalid or expired." }, { status: 400 });
  if (newPassword !== confirmPassword) return NextResponse.json({ ok: false, error: "New passwords do not match." }, { status: 400 });
  const passwordError = validateNewPassword(newPassword);
  if (passwordError) return NextResponse.json({ ok: false, error: passwordError }, { status: 400 });
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashPasswordResetToken(token) } });
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) return NextResponse.json({ ok: false, error: "Reset link is invalid or expired." }, { status: 400 });
  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash: hashPassword(newPassword) } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
    prisma.authSession.deleteMany({ where: { userId: resetToken.userId } })
  ]);
  return NextResponse.json({ ok: true, redirectTo: "/signin?reset=success" });
}
