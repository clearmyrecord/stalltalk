"use client";
import { useState } from "react";
export default function ResetPasswordForm({ token }: { token: string }) {
  const [error, setError] = useState("");
  async function submit(formData: FormData) {
    setError("");
    formData.set("token", token);
    const response = await fetch("/api/account/reset-password", { method: "POST", body: formData });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) { setError(result.error || "Unable to reset password."); return; }
    window.location.href = result.redirectTo || "/signin?reset=success";
  }
  return <form action={submit} className="mt-6 grid gap-3">{error ? <p className="rounded-xl bg-stallRed p-3 font-black text-white">{error}</p> : null}<label className="grid gap-1 font-black uppercase">New password<input name="newPassword" type="password" required minLength={8} className="rounded border-2 border-ink p-3" /></label><label className="grid gap-1 font-black uppercase">Confirm password<input name="confirmPassword" type="password" required minLength={8} className="rounded border-2 border-ink p-3" /></label><button className="rounded-xl bg-ink px-5 py-3 font-black uppercase text-white">Reset password</button></form>;
}
