"use client";

export function PublicIssueUrlActions({ url }: { url: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => navigator.clipboard?.writeText(url)}
        className="rounded-xl bg-ink px-4 py-2 font-black uppercase text-white"
      >
        Copy Link
      </button>
      <a href={url} target="_blank" rel="noreferrer" className="rounded-xl border-4 border-ink px-4 py-2 font-black uppercase">
        Open Issue
      </a>
    </div>
  );
}
