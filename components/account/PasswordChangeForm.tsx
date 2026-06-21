"use client";

import { useState } from "react";

export function PasswordChangeForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(formData: FormData) {
    setMessage("");
    setError("");
    const response = await fetch("/api/account/change-password", { method: "POST", body: formData });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      setError(result.error || "Unable to change password.");
      return;
    }
    setMessage("Password changed successfully.");
  }
  return <section className="mt-6 rounded-2xl border-4 border-ink bg-white p-6 shadow-brutal"><p className="font-black uppercase tracking-[.25em] text-stallRed">Security</p><h2 className="font-display text-5xl uppercase">Change Password</h2>{message ? <p className="mt-4 rounded-xl bg-green-100 p-3 font-black">{message}</p> : null}{error ? <p className="mt-4 rounded-xl bg-stallRed p-3 font-black text-white">{error}</p> : null}<form action={submit} className="mt-6 grid gap-3"><label className="grid gap-1 font-black uppercase">Current password<input name="currentPassword" type="password" required className="rounded border-2 border-ink p-3" /></label><label className="grid gap-1 font-black uppercase">New password<input name="newPassword" type="password" required minLength={8} className="rounded border-2 border-ink p-3" /></label><label className="grid gap-1 font-black uppercase">Confirm new password<input name="confirmPassword" type="password" required minLength={8} className="rounded border-2 border-ink p-3" /></label><button className="rounded-xl bg-ink px-5 py-3 font-black uppercase text-white">Change password</button></form></section>;
}
