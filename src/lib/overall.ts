import type { Intensity, OverallSignal, Signal, Stock } from "@/types";

// Step 4c-9: portfolio overall is derived client-side from the stocks'
// overalls — no GPT call. Each stock's GPT overall maps to a signed score
// (intensity = magnitude); the mean is rounded back to a signal/intensity band.

const SCORE: Record<Signal, Record<Intensity, number>> = {
  positive: { strong: 3, mid: 2, mild: 1 },
  neutral: { strong: 0, mid: 0, mild: 0 },
  negative: { strong: -3, mid: -2, mild: -1 },
};

function scoreOf(o: OverallSignal): number {
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

/** Portfolio overall = mean of the stocks' overall scores, banded. Stronger
 *  stocks (±3) pull harder than milder ones (±1) without extra weighting. */
export function aggregateOverall(stocks: Stock[]): OverallSignal {
  if (stocks.length === 0) return { signal: "neutral", intensity: "mid" };
  const avg = stocks.reduce((sum, s) => sum + scoreOf(s.overall), 0) / stocks.length;
  return bandOf(avg);
}
