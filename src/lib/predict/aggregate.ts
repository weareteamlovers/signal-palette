// Step 5 / Phase 2: deterministic aggregation of retrieved neighbor outcomes
// into a prediction. This is where the *numbers* come from — the LLM never
// invents them, it only narrates the result. Pure functions (unit-testable).

import type { NeighborEvent } from "@/lib/supabase/events";
import type {
  Confidence,
  HorizonStat,
  PredictDirection,
} from "./types";

const HORIZONS = [1, 3, 5] as const;
/** Below this |median| the move is treated as no-edge (neutral). */
const NEUTRAL_EPS = 0.003; // 0.3% excess
/** Horizons with |median| ≥ this (and matching direction) form the impact period. */
const MATERIAL_EPS = 0.003;

export interface Aggregation {
  sampleSize: number;
  direction: PredictDirection;
  band: { low: number; high: number } | null;
  primaryHorizon: number;
  impactPeriod: { from: number; to: number } | null;
  confidence: Confidence;
  horizons: HorizonStat[];
  /** Neighbors agreeing with `direction` at the primary horizon (for rationale). */
  agreeCount: number;
  meanSimilarity: number;
}

function abretAt(n: NeighborEvent, days: number): number | null {
  if (days === 1) return n.abret_1d;
  if (days === 3) return n.abret_3d;
  return n.abret_5d;
}

/** Linear-interpolated quantile over an ascending-sorted array. */
function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1] ?? sorted[base];
  return sorted[base] + (next - sorted[base]) * rest;
}

function statFor(neighbors: NeighborEvent[], days: number): HorizonStat {
  const vals = neighbors
    .map((n) => abretAt(n, days))
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);
  const n = vals.length;
  return {
    tradingDays: days,
    n,
    median: n ? quantile(vals, 0.5) : 0,
    p25: n ? quantile(vals, 0.25) : 0,
    p75: n ? quantile(vals, 0.75) : 0,
    posRate: n ? vals.filter((v) => v > 0).length / n : 0,
  };
}

function scoreConfidence(
  n: number,
  agreeRate: number,
  meanSim: number,
  iqr: number,
): Confidence {
  let s = 0;
  if (n >= 12) s += 2;
  else if (n >= 6) s += 1;
  if (agreeRate >= 0.75) s += 2;
  else if (agreeRate >= 0.6) s += 1;
  if (meanSim >= 0.5) s += 1;
  if (iqr <= 0.04) s += 1;
  return s >= 4 ? "high" : s >= 2 ? "medium" : "low";
}

/** Aggregate retrieved labeled neighbors into a prediction (sans rationale).
 *  `direction` is the sign of the largest-magnitude horizon median; the band is
 *  that horizon's p25–p75. Confidence blends sample size, sign agreement,
 *  similarity, and dispersion. */
export function aggregateNeighbors(neighbors: NeighborEvent[]): Aggregation {
  const horizons = HORIZONS.map((d) => statFor(neighbors, d));

  // Primary horizon = the one whose median has the largest magnitude.
  const withData = horizons.filter((h) => h.n > 0);
  const primary =
    withData.length === 0
      ? horizons.find((h) => h.tradingDays === 3)!
      : withData.reduce((a, b) =>
          Math.abs(b.median) > Math.abs(a.median) ? b : a,
        );

  const direction: PredictDirection =
    Math.abs(primary.median) < NEUTRAL_EPS
      ? "neutral"
      : primary.median > 0
        ? "up"
        : "down";

  const dirSign = direction === "up" ? 1 : direction === "down" ? -1 : 0;

  // Material horizons matching the direction → contiguous impact period.
  const material = horizons
    .filter(
      (h) =>
        h.n > 0 &&
        Math.abs(h.median) >= MATERIAL_EPS &&
        Math.sign(h.median) === dirSign,
    )
    .map((h) => h.tradingDays);
  const impactPeriod =
    direction === "neutral" || material.length === 0
      ? null
      : { from: Math.min(...material), to: Math.max(...material) };

  const band =
    direction === "neutral" || primary.n === 0
      ? null
      : { low: primary.p25, high: primary.p75 };

  const agreeCount =
    dirSign === 0
      ? primary.n
      : neighbors.filter((nb) => {
          const v = abretAt(nb, primary.tradingDays);
          return v !== null && Math.sign(v) === dirSign;
        }).length;
  const agreeRate = primary.n ? agreeCount / primary.n : 0;
  const meanSimilarity = neighbors.length
    ? neighbors.reduce((s, n) => s + n.similarity, 0) / neighbors.length
    : 0;

  return {
    sampleSize: primary.n,
    direction,
    band,
    primaryHorizon: primary.tradingDays,
    impactPeriod,
    confidence: scoreConfidence(
      primary.n,
      agreeRate,
      meanSimilarity,
      primary.p75 - primary.p25,
    ),
    horizons,
    agreeCount,
    meanSimilarity,
  };
}
