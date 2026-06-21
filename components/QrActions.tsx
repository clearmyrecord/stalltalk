"use client";

export function QrActions({ url }: { url: string }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs font-black uppercase">
      <button type="button" className="rounded bg-ink p-2 text-white" onClick={() => navigator.clipboard?.writeText(url)}>
        Copy URL
      </button>
      <a className="rounded bg-ink p-2 text-white" href={url} target="_blank" rel="noreferrer">
        Test Link
      </a>
    </div>
  );
}
