"use client";

import { useState } from "react";

type Field = { name: string; label: string; required?: boolean };

export function ProfileOnboarding({ title, fields, endpoint, button }: { title: string; fields: Field[]; endpoint: string; button: string }) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(formData: FormData) {
    setError("");
    setSaving(true);
    try {
      const response = await fetch(endpoint, { method: "PATCH", body: formData });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to save profile.");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save profile.");
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl rounded-2xl border-4 border-ink bg-white p-6 shadow-brutal">
      <p className="font-black uppercase tracking-[.25em] text-stallRed">Onboarding</p>
      <h1 className="font-display text-5xl uppercase">{title}</h1>
      {error ? <p className="mt-4 rounded-xl bg-stallRed p-3 font-black text-white">{error}</p> : null}
      <form action={submit} className="mt-5 grid gap-3">
        {fields.map((field) => (
          <label key={field.name} className="grid gap-1 font-black uppercase">
            {field.label}
            <input name={field.name} required={field.required ?? true} className="rounded border-2 border-ink p-3" />
          </label>
        ))}
        <button disabled={saving} className="rounded-xl bg-ink px-5 py-3 font-black uppercase text-white disabled:opacity-60">{saving ? "Saving..." : button}</button>
      </form>
    </section>
  );
}
