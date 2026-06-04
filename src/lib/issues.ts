import type { Issue } from "@/types";

/** Number of issues shown per stock on mobile. The desktop card fetches the
 *  full set once; on a viewport resize we trim at render to the top issues
 *  instead of re-analyzing (Step 4b). */
export const MOBILE_MAX_ISSUES = 10;

/** Recency half-life for the pop score: a just-published issue weighs 1.0, a
 *  3-day-old one 0.5, a 6-day-old one 0.25, etc. */
const RECENCY_HALFLIFE_MS = 3 * 24 * 60 * 60 * 1000;

/** Recency weight in (0, 1]. Undated / unparseable createdAt → neutral 0.5 so
 *  it neither wins nor loses purely on missing data. */
function recencyWeight(createdAt: string | undefined, nowMs: number): number {
  if (!createdAt) return 0.5;
  const t = Date.parse(createdAt);
  if (Number.isNaN(t)) return 0.5;
  const age = Math.max(0, nowMs - t);
  return 0.5 ** (age / RECENCY_HALFLIFE_MS);
}

/** Step 4d: pop score blends GPT importance (rank, 1 = most important) with
 *  recency (createdAt) so recent + important issues float to the top. Both
 *  components are normalized to ~[0,1] and averaged. */
function popScore(issue: Issue, nowMs: number, total: number): number {
  const rank = typeof issue.importance === "number" ? issue.importance : total;
  const impNorm = (total - rank + 1) / total; // rank 1 → 1, rank N → 1/N
  return 0.5 * impNorm + 0.5 * recencyWeight(issue.createdAt, nowMs);
}

/** Pick the `n` highest-pop-score issues (recency-weighted importance),
 *  preserving the input array order (7-bucket) for display. Returns the input
 *  untouched when it already fits. Computed at render time so `now` reflects
 *  how stale cached issues have become. */
export function topByPop(issues: Issue[], n: number, nowMs: number = Date.now()): Issue[] {
  if (issues.length <= n) return issues;
  const total = issues.length;
  const keep = new Set(
    [...issues]
      .map((issue, i) => ({ issue, i, s: popScore(issue, nowMs, total) }))
      .sort((a, b) => b.s - a.s || a.i - b.i)
      .slice(0, n)
      .map((x) => x.issue),
  );
  return issues.filter((issue) => keep.has(issue));
}
