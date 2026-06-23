"use client";

import { useState } from "react";

type ImportResult = {
  ok: boolean;
  message?: string;
  diagnostics?: {
    eventsSearched: number;
    eventsImported: number;
    duplicatesSkipped: number;
    eventsNeedingReview: number;
    sourceFailures: Array<{ sourceName: string; url: string; error: string }>;
  };
};

export function JulyEventsImportButton() {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function runImport() {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/admin/events/import-july-2026-las-vegas", { method: "POST" });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  }

  return <section className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal">
    <h2 className="font-display text-4xl uppercase">July 2026 Las Vegas Events</h2>
    <p className="font-bold">Import real, source-attributed community events for the July 2026 Potty Favor issue. Imported events start as pending review.</p>
    <button type="button" onClick={runImport} disabled={loading} className="mt-3 rounded bg-stallYellow px-4 py-3 font-black uppercase disabled:opacity-60">{loading ? "Importing…" : "Auto-Populate July 2026 Las Vegas Events"}</button>
    {result ? <div className="mt-4 rounded-xl border-2 border-ink bg-paper p-3 font-bold">
      <p>{result.ok ? "Import finished." : "Import failed."} {result.message || ""}</p>
      {result.diagnostics ? <ul className="mt-2 grid gap-1">
        <li>Events searched: {result.diagnostics.eventsSearched}</li>
        <li>Events imported: {result.diagnostics.eventsImported}</li>
        <li>Duplicates skipped: {result.diagnostics.duplicatesSkipped}</li>
        <li>Events needing review: {result.diagnostics.eventsNeedingReview}</li>
        <li>Source failures: {result.diagnostics.sourceFailures.length}</li>
      </ul> : null}
    </div> : null}
  <p className="mt-3"><a className="font-black text-stallPurple underline" href="/admin/events">Review imported July events</a></p>
  </section>;
}
