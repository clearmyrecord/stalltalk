"use client";

import { useEffect } from "react";

export function ImpressionRecorder({ events }: { events: Array<Record<string, string | number | null | undefined>> }) {
  useEffect(() => {
    const visitorId = window.localStorage.getItem("stalltalkVisitorId") || crypto.randomUUID();
    window.localStorage.setItem("stalltalkVisitorId", visitorId);
    const sessionId = crypto.randomUUID();
    for (const event of events) {
      const body = JSON.stringify({ ...event, visitorId, sessionId, type: "AD_IMPRESSION", path: window.location.pathname + window.location.search });
      navigator.sendBeacon?.("/api/analytics", new Blob([body], { type: "application/json" })) || fetch("/api/analytics", { method: "POST", body, headers: { "Content-Type": "application/json" } });
    }
  }, [events]);
  return null;
}
