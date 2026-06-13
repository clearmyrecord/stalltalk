"use client";

import { useEffect } from "react";

export function ReviewViewRecorder({ publisherId, venueId, issueId, restaurantReviewId, restaurantName }: { publisherId?: string | null; venueId?: string | null; issueId?: string | null; restaurantReviewId: string; restaurantName: string }) {
  useEffect(() => {
    const key = `review-view:${restaurantReviewId}:${issueId || "global"}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    fetch("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ publisherId, venueId, issueId, type: "REVIEW_VIEW", metadata: { restaurantReviewId, restaurantName } }) }).catch(() => undefined);
  }, [publisherId, venueId, issueId, restaurantReviewId, restaurantName]);
  return null;
}
