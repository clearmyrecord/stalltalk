export type ScheduleState = "Draft" | "Scheduled" | "Live" | "Ended" | "Canceled";

export function scheduledTargetWhere(now = new Date()): any {
  return { publishAt: { lte: now }, OR: [{ unpublishAt: null }, { unpublishAt: { gt: now } }], canceledAt: null, issue: { status: { in: ["PUBLISHED", "SCHEDULED"] }, isPublished: true, isArchived: false } };
}

export function targetOrderBy() {
  return [{ publishAt: "desc" as const }, { issueId: "desc" as const }];
}

export function computeIssueState(issue: { status: string; isArchived?: boolean | null; isPublished?: boolean | null; isScheduled?: boolean | null; issueTargets?: Array<{ publishAt?: Date | null; unpublishAt?: Date | null; canceledAt?: Date | null }> }, now = new Date()): ScheduleState {
  const targets = issue.issueTargets || [];
  if (targets.some((target) => target.canceledAt)) return "Canceled";
  if (issue.isArchived || issue.status === "ARCHIVED") return "Ended";
  if (!issue.isPublished && !issue.isScheduled && issue.status === "DRAFT") return "Draft";
  const earliest = targets.map((target) => target.publishAt).filter(Boolean).sort((a, b) => a!.getTime() - b!.getTime())[0];
  const latestEnd = targets.map((target) => target.unpublishAt).filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0];
  if (latestEnd && latestEnd <= now) return "Ended";
  if (earliest && earliest > now) return "Scheduled";
  if (issue.isPublished || issue.status === "PUBLISHED" || issue.status === "SCHEDULED") return "Live";
  return "Draft";
}

export function timeZoneAbbreviation(timeZone = "America/Los_Angeles", at = new Date()) {
  const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" }).formatToParts(at).find((p) => p.type === "timeZoneName");
  return part?.value || timeZone;
}

export function formatInVenueTime(date: Date | null | undefined, timeZone = "America/Los_Angeles") {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", { timeZone, dateStyle: "medium", timeStyle: "short", timeZoneName: "short" }).format(date);
}

export function zonedDateTimeToUtc(date: string | null, time: string | null, timeZone = "America/Los_Angeles") {
  if (!date) return null;
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = (time || "00:00").split(":").map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const offset = zonedOffsetMs(utcGuess, timeZone);
  let result = new Date(utcGuess.getTime() - offset);
  const corrected = zonedOffsetMs(result, timeZone);
  if (corrected !== offset) result = new Date(utcGuess.getTime() - corrected);
  return result;
}

function zonedOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, Number(p.value)]));
  const asUtc = Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second);
  return asUtc - date.getTime();
}
