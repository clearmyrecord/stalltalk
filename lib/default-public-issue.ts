export const DEFAULT_PUBLIC_ISSUE_ID = "default-public-issue";
export const DEFAULT_PUBLIC_ISSUE_LABEL = "Default Public Issue";

export function isDefaultPublicIssue(issueId: string | null | undefined) {
  return issueId === DEFAULT_PUBLIC_ISSUE_ID;
}
