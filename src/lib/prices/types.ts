// Price/sector data-layer domain types (Step 5 / Phase 0). Server-only — the
// Yahoo client and Naver symbol lookup use no browser-safe surface. The
// labeling job (Phase 1) turns an event timestamp into a realized reaction
// using these shapes.

/** One daily bar. `date` is the exchange-local trading day (YYYY-MM-DD). */
export interface Candle {
  date: string;
  close: number;
  /** Split/dividend-adjusted close — use this for return math. */
  adjClose: number;
}

/** A stock resolved to everything the labeling job needs to measure its
 *  sector-relative reaction. */
export interface PriceContext {
  /** Yahoo symbol for the stock, e.g. "NVDA", "005930.KS". */
  symbol: string;
  /** Yahoo GICS sector (English) when known, e.g. "Technology". */
  sector?: string;
  /** Yahoo industry (English) when known, e.g. "Semiconductors". */
  industry?: string;
  /** Yahoo symbol of the sector/market benchmark for excess-return math. */
  benchmark: string;
}
