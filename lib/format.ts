import type { ContentBlockType } from "@prisma/client";

export const contentLabels: Record<ContentBlockType, string> = {
  ARTICLE: "Article",
  QUOTE: "Inspirational Quote",
  FACT: "Did You Know?",
  JOKE: "Hilariously Funny",
  CALENDAR: "Entertainment Calendar",
  EVENT: "Event Spotlight",
  COUPON: "Local Deals",
  ADVERTISEMENT: "Advertisement",
  RESTAURANT_REVIEW: "Restaurant Review",
  ANNOUNCEMENT: "Announcement",
  SPONSOR_SLOT: "Sponsor Slot"
};

export const typeOptions = Object.entries(contentLabels).map(([value, label]) => ({ value, label }));

export function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

export function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

export function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

export function percent(value: number) {
  return `${Math.round(value * 1000) / 10}%`;
}
