import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken, hashPasswordResetToken, passwordResetExpiresAt, publicBaseUrl } from "@/lib/password-reset";

const GENERIC = "If an account exists, reset instructions have been sent.";

function value(form: FormData | Record<string, unknown>, key: string) {
  const raw = form instanceof FormData ? form.get(key) : form[key];
  return String(raw || "").trim();
}

async function sendOrLogResetLink(email: string, link: string) {
  if (process.env.PASSWORD_RESET_EMAIL_ENDPOINT) {
    await fetch(process.env.PASSWORD_RESET_EMAIL_ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ to: email, resetLink: link }) });
    return;
  }
  if (process.env.NODE_ENV !== "production") console.info(`[password-reset] ${email}: ${link}`);
}

export async function POST(request: Request) {
  const form = request.headers.get("content-type")?.includes("application/json") ? await request.json() : await request.formData();
  const email = value(form, "email").toLowerCase();
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (user) {
    const token = createPasswordResetToken();
    await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashPasswordResetToken(token), expiresAt: passwordResetExpiresAt() } });
    const link = `${publicBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
    await sendOrLogResetLink(user.email, link);
  }
  return NextResponse.json({ ok: true, message: GENERIC });
}
