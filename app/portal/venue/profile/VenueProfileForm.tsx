"use client";

import { useState } from "react";

type VenueProfile = {
  name: string;
  venueType: string;
  address: string;
  city: string;
  state: string;
  zip: string | null;
  phone: string | null;
  website: string | null;
  contactName: string | null;
  contactEmail: string | null;
  description: string | null;
  logoImageUrl: string | null;
};

export function VenueProfileForm({ venue }: { venue: VenueProfile | null }) {
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(formData: FormData) {
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      const response = await fetch("/api/portal/venue/profile", {
        method: "PATCH",
        body: formData,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Unable to save venue profile.");
      }
      setSaved(true);
      if (!venue) window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save venue profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form action={submit} className="mt-6 grid gap-4">
      {saved ? (
        <p className="rounded-xl border-4 border-ink bg-stallYellow p-3 font-black uppercase">
          Venue profile saved.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl bg-stallRed p-3 font-black text-white">{error}</p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Field name="venueName" label="Venue name" required defaultValue={venue?.name || ""} />
        <Field name="venueType" label="Venue type" required defaultValue={venue?.venueType || "venue"} />
        <Field name="address" label="Address" required defaultValue={venue?.address || ""} />
        <Field name="city" label="City" required defaultValue={venue?.city || ""} />
        <Field name="state" label="State" required defaultValue={venue?.state || ""} />
        <Field name="zip" label="Zip" defaultValue={venue?.zip || ""} />
        <Field name="phone" label="Phone" defaultValue={venue?.phone || ""} />
        <Field name="website" label="Website" type="url" defaultValue={venue?.website || ""} />
        <Field name="contactName" label="Contact name" defaultValue={venue?.contactName || ""} />
        <Field name="contactEmail" label="Contact email" type="email" defaultValue={venue?.contactEmail || ""} />
        <Field name="logoImageUrl" label="Logo/image URL" type="url" defaultValue={venue?.logoImageUrl || ""} />
      </div>
      <label className="grid gap-1 font-black uppercase">
        Description
        <textarea
          name="description"
          defaultValue={venue?.description || ""}
          className="min-h-32 rounded border-2 border-ink p-3 font-normal normal-case"
        />
      </label>
      {venue?.logoImageUrl ? (
        <div className="rounded-xl border-2 border-ink bg-paper p-3">
          <p className="font-black uppercase text-stallRed">Current logo/image</p>
          <img
            src={venue.logoImageUrl}
            alt={`${venue.name} logo or venue image`}
            className="mt-2 max-h-48 rounded-lg border-2 border-ink bg-white object-contain"
          />
        </div>
      ) : null}
      <button
        disabled={saving}
        className="rounded-xl bg-ink px-5 py-3 font-black uppercase text-white disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save venue profile"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="grid gap-1 font-black uppercase">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="rounded border-2 border-ink p-3 font-normal normal-case"
      />
    </label>
  );
}
