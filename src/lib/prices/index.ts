// Price/sector data layer (Step 5 / Phase 0). One entry point for the labeling
// job: resolve a stock to its Yahoo symbol + sector benchmark, fetch daily
// candles, and compute excess (sector-relative) forward returns. Every piece
// degrades gracefully (null/[]), so a flaky source never breaks labeling.

import type { Market } from "@/data/stock-catalog";
import { benchmarkFor } from "./benchmark";
import { resolveSymbol } from "./symbol";
import type { PriceContext } from "./types";

export type { Candle, PriceContext } from "./types";
export { fetchDailyCandles } from "./yahoo";
export { forwardReturn, excessReturn } from "./returns";

/** Resolve a stock → {symbol, sector, industry, benchmark}. null when the
 *  symbol can't be resolved (Naver/Yahoo both fail). */
export async function resolvePriceContext(
  name: string,
  market: Market,
  ticker?: string,
): Promise<PriceContext | null> {
  const r = await resolveSymbol(name, market, ticker);
  if (!r) return null;
  return {
    symbol: r.symbol,
    sector: r.sector,
    industry: r.industry,
    benchmark: benchmarkFor(market, r.sector, r.industry),
  };
}
