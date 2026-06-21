export const DEFAULT_PUBLIC_ISSUE_ID = "default-public-issue";
export const DEFAULT_PUBLIC_ISSUE_LABEL = "Default Public Issue";
export const DEFAULT_PUBLIC_ISSUE_TARGET = {
  id: DEFAULT_PUBLIC_ISSUE_ID,
  title: DEFAULT_PUBLIC_ISSUE_LABEL,
  label: DEFAULT_PUBLIC_ISSUE_LABEL,
  venueName: "Public",
  status: "PUBLISHED",
  isDefault: true,
  targetType: DEFAULT_PUBLIC_ISSUE_ID
} as const;

export function isDefaultPublicIssue(issueId: string | null | undefined) {
  return issueId === DEFAULT_PUBLIC_ISSUE_ID;
}
