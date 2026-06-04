// Forward / excess return math over a daily candle series (Step 5 / Phase 0).
// Pure functions — the labeling job (Phase 1) calls these to turn an event
// timestamp into a realized "reaction". Returns are fractions (0.012 = +1.2%).

import type { Candle } from "./types";

/** Index of the baseline candle: first trading day on/after t0's UTC date.
 *  -1 when t0 is past the end of the series. */
function baselineIndex(candles: Candle[], t0Ms: number): number {
  const d0 = new Date(t0Ms).toISOString().slice(0, 10);
  return candles.findIndex((c) => c.date >= d0);
}

/** Return from the baseline trading day to `tradingDays` sessions later, using
 *  adjusted close. null when the series lacks enough data. */
export function forwardReturn(
  candles: Candle[],
  t0Ms: number,
  tradingDays: number,
): number | null {
  const i0 = baselineIndex(candles, t0Ms);
  if (i0 < 0) return null;
  const it = i0 + tradingDays;
  if (it >= candles.length) return null;
  const p0 = candles[i0].adjClose;
  if (!(p0 > 0)) return null;
  return candles[it].adjClose / p0 - 1;
}

/** Excess (abnormal) return vs a benchmark over the same window:
 *  stock return − benchmark return. null if either leg is unavailable. */
export function excessReturn(
  stock: Candle[],
  benchmark: Candle[],
  t0Ms: number,
  tradingDays: number,
): number | null {
  const s = forwardReturn(stock, t0Ms, tradingDays);
  const b = forwardReturn(benchmark, t0Ms, tradingDays);
  if (s === null || b === null) return null;
  return s - b;
}
