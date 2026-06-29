"use client";

export function PublicIssueUrlActions({ url, qrSlug, copyLabel = "Copy Link", openLabel = "Open Issue" }: { url: string; qrSlug?: string | null; copyLabel?: string; openLabel?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => navigator.clipboard?.writeText(url)} className="rounded-xl bg-ink px-4 py-2 font-black uppercase text-white">
        {copyLabel}
      </button>
      <a href={url} target="_blank" rel="noreferrer" className="rounded-xl border-4 border-ink px-4 py-2 font-black uppercase">
        {openLabel}
      </a>
      {qrSlug ? <a href={`/api/qr/${encodeURIComponent(qrSlug)}/asset?format=png`} download className="rounded-xl border-4 border-ink bg-stallYellow px-4 py-2 font-black uppercase">Download/Print QR</a> : null}
    </div>
  );
}
