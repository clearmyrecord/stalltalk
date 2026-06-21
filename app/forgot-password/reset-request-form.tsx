"use client";
import { useState } from "react";
const GENERIC = "If an account exists, reset instructions have been sent.";
export default function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  async function submit(formData: FormData) {
    setMessage("");
    await fetch("/api/account/forgot-password", { method: "POST", body: formData });
    setMessage(GENERIC);
  }
  return <form action={submit} className="mt-6 grid gap-3">{message ? <p className="rounded-xl bg-green-100 p-3 font-black">{message}</p> : null}<label className="grid gap-1 font-black uppercase">Email<input name="email" type="email" required className="rounded border-2 border-ink p-3" /></label><button className="rounded-xl bg-ink px-5 py-3 font-black uppercase text-white">Send reset instructions</button></form>;
}
