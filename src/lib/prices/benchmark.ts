// Sector/market → benchmark Yahoo symbol (Step 5 / Phase 0). "Reaction" is
// measured as excess return vs this benchmark (project decision: 섹터 대비
// 초과수익). Yahoo's sector/industry strings drive the map.
//
// US: SPDR Select-Sector ETFs, with a semiconductor override — the app's
//     portfolio is semi-heavy, so SMH captures sector moves far better than
//     broad XLK.
// KR: a sector ETF only where one reliably trades on Yahoo (반도체 → KODEX
//     반도체 091160.KS); otherwise the KOSPI index ^KS11 as an honest
//     market-relative fallback (KR sector-ETF coverage on Yahoo is partial —
//     refine in a later step).

import type { Market } from "@/data/stock-catalog";

// Yahoo GICS sector (English) → SPDR sector ETF.
const US_SECTOR_ETF: Record<string, string> = {
  Technology: "XLK",
  "Financial Services": "XLF",
  "Communication Services": "XLC",
  "Consumer Cyclical": "XLY",
  "Consumer Defensive": "XLP",
  Healthcare: "XLV",
  Industrials: "XLI",
  "Basic Materials": "XLB",
  Energy: "XLE",
  Utilities: "XLU",
  "Real Estate": "XLRE",
};

function isSemiconductor(industry?: string): boolean {
  return !!industry && /semiconductor/i.test(industry);
}

/** Benchmark Yahoo symbol for excess-return math. Always returns something (a
 *  market index when no sector match) so a label can still be computed. */
export function benchmarkFor(
  market: Market,
  sector?: string,
  industry?: string,
): string {
  if (market === "US") {
    if (isSemiconductor(industry)) return "SMH";
    return (sector && US_SECTOR_ETF[sector]) || "SPY";
  }
  // KR
  if (isSemiconductor(industry)) return "091160.KS"; // KODEX 반도체
  return "^KS11"; // KOSPI
}
