"use client";

import { useState } from "react";

type Result = Record<string, unknown>;

export function OpenAiTestButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function runTest() {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/system-health?runImageTest=1", { cache: "no-store" });
      const data = await response.json();
      setResult({ ok: response.ok, ...data });
    } catch (error) {
      setResult({ ok: false, error: error instanceof Error ? error.message : "Connection test failed." });
    } finally {
      setLoading(false);
    }
  }

  const openAi = result?.openAi as Record<string, unknown> | undefined;

  return <div className="rounded-2xl border-4 border-ink bg-white p-5 shadow-brutal">
    <h2 className="font-display text-4xl uppercase">OpenAI Image Test</h2>
    <p className="font-bold">Runs a real low-quality image generation call to verify the deployed key, model, and image endpoint.</p>
    <button className="mt-4 rounded-xl border-4 border-ink bg-stallYellow px-4 py-3 font-black uppercase shadow-brutal disabled:opacity-50" disabled={loading} onClick={runTest}>{loading ? "Testing OpenAI…" : "Test OpenAI Connection"}</button>
    {result ? <div className="mt-4 grid gap-2 rounded-xl border-2 border-ink bg-paper p-3 text-sm font-black uppercase">
      <span>API key detected: {String(openAi?.apiKeyDetected ?? false)}</span>
      <span>Model detected: {String(openAi?.model ?? "unknown")}</span>
      <span>Successful image generation test: {openAi?.imageGenerationTest === "successful" ? "yes" : "no"}</span>
      <span>OpenAI status: {String(openAi?.status ?? "Failed")}</span>
      {openAi?.error ? <span className="text-stallRed">Exact error: {String(openAi.error)}</span> : null}
    </div> : null}
  </div>;
}
