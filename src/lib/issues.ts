import type { Issue } from "@/types";

/** Number of issues shown per stock on mobile. The desktop card fetches the
 *  full set once; on a viewport resize we trim at render to the most important
 *  issues instead of re-analyzing (Step 4b). */
export const MOBILE_MAX_ISSUES = 10;

/** Pick the `n` most important issues (importance rank 1 = most important),
 *  preserving the input array order (7-bucket) for display. Falls back to a
 *  plain head-slice when importance is missing on any issue (e.g. a mock
 *  fallback stock). Returns the input untouched when it already fits. */
export function topByImportance(issues: Issue[], n: number): Issue[] {
  if (issues.length <= n) return issues;
  if (!issues.every((i) => typeof i.importance === "number")) {
    return issues.slice(0, n);
  }
  const keep = new Set(
    [...issues]
      .sort((a, b) => (a.importance as number) - (b.importance as number))
      .slice(0, n),
  );
  return issues.filter((i) => keep.has(i));
}
