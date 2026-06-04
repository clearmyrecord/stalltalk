"use client";

import { useEffect } from "react";

export function ScanRecorder({ publisherId, venueId, restroomId, qrCodeId, issueId }: { publisherId?: string | null; venueId?: string | null; restroomId?: string | null; qrCodeId?: string | null; issueId: string }) {
  useEffect(() => {
    const visitorId = window.localStorage.getItem("stalltalkVisitorId") || crypto.randomUUID();
    window.localStorage.setItem("stalltalkVisitorId", visitorId);
    const sessionId = crypto.randomUUID();
    const startedAt = Date.now();
    const payload = { publisherId, venueId, restroomId, qrCodeId, issueId, visitorId, sessionId, path: window.location.pathname + window.location.search };
    send({ ...payload, type: "SCAN" });
    send({ ...payload, type: "PAGE_VIEW" });
    const onLeave = () => send({ ...payload, type: "TIME_ON_PAGE", durationMs: Date.now() - startedAt });
    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
  }, [publisherId, venueId, restroomId, qrCodeId, issueId]);
  return null;
}

function send(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  navigator.sendBeacon?.("/api/analytics", new Blob([body], { type: "application/json" })) || fetch("/api/analytics", { method: "POST", body, headers: { "Content-Type": "application/json" } });
}
