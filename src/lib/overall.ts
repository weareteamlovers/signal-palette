import type { Intensity, OverallSignal, Signal, Stock } from "@/types";

// Step 4c-9 / 4d: overalls are derived from signal+intensity scores — no GPT.
// Portfolio overall = mean of stock overalls; stock overall = mean of its
// issues. Same scoring/banding for both.

const SCORE: Record<Signal, Record<Intensity, number>> = {
  positive: { strong: 3, mid: 2, mild: 1 },
  neutral: { strong: 0, mid: 0, mild: 0 },
  negative: { strong: -3, mid: -2, mild: -1 },
};

function scoreOf(o: { signal: Signal; intensity: Intensity }): number {
  return SCORE[o.signal][o.intensity];
}

/** Round a mean score (−3..+3) to the nearest band:
 *  |s| <0.5 neutral · <1.5 mild · <2.5 mid · ≥2.5 strong. */
function bandOf(score: number): OverallSignal {
  const m = Math.abs(score);
  if (m < 0.5) return { signal: "neutral", intensity: "mid" };
  const intensity: Intensity = m < 1.5 ? "mild" : m < 2.5 ? "mid" : "strong";
  return { signal: score > 0 ? "positive" : "negative", intensity };
}

function aggregate(items: ReadonlyArray<{ signal: Signal; intensity: Intensity }>): OverallSignal {
  if (items.length === 0) return { signal: "neutral", intensity: "mid" };
  const avg = items.reduce((sum, i) => sum + scoreOf(i), 0) / items.length;
  return bandOf(avg);
}

/** Portfolio overall = mean of the stocks' overall scores, banded. Stronger
 *  stocks (±3) pull harder than milder ones (±1) without extra weighting. */
export function aggregateOverall(stocks: Stock[]): OverallSignal {
  return aggregate(stocks.map((s) => s.overall));
}

/** Stock overall = mean of its issues' scores, banded (Step 4d). Used because
 *  the accumulating store means GPT only ever classifies the newest batch, so
 *  its per-call overall wouldn't reflect the full stored set. */
export function stockOverallFromIssues(
  issues: ReadonlyArray<{ signal: Signal; intensity: Intensity }>,
): OverallSignal {
  return aggregate(issues);
}
