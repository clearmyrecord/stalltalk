export const PRICE_PER_PLACEMENT_MONTH_CENTS = 5000;
export const FLIGHT_MONTH_OPTIONS = [1, 2, 3, 6, 12] as const;

export function normalizeFlightMonth(value?: string | null) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})$/);
  if (match) return `${match[1]}-${match[2]}`;
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function safeFlightMonths(value: number) {
  return FLIGHT_MONTH_OPTIONS.includes(value as (typeof FLIGHT_MONTH_OPTIONS)[number]) ? value : 1;
}

export function addMonthsToFlightMonth(month: string, offset: number) {
  const [year, monthIndex] = normalizeFlightMonth(month).split("-").map(Number);
  const date = new Date(Date.UTC(year, monthIndex - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function flightEndMonth(startMonth: string, flightMonths: number) {
  return addMonthsToFlightMonth(startMonth, Math.max(1, flightMonths) - 1);
}

export function flightDateRange(startMonth: string, flightMonths: number) {
  const normalizedStart = normalizeFlightMonth(startMonth);
  const [year, monthIndex] = normalizedStart.split("-").map(Number);
  const startsAt = new Date(Date.UTC(year, monthIndex - 1, 1, 0, 0, 0, 0));
  const endsAt = new Date(Date.UTC(year, monthIndex - 1 + Math.max(1, flightMonths), 1, 0, 0, 0, 0));
  endsAt.setUTCMilliseconds(-1);
  return { startsAt, endsAt };
}

export function calculateFlightTotal(placementCount: number, flightMonths: number) {
  return Math.max(1, placementCount) * Math.max(1, flightMonths) * PRICE_PER_PLACEMENT_MONTH_CENTS;
}

export function flightStatus(startsAt?: Date | null, endsAt?: Date | null, now = new Date()) {
  if (startsAt && startsAt > now) return "Upcoming";
  if (endsAt && endsAt < now) return "Expired";
  return "Active";
}
