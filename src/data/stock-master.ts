import { STOCK_CATALOG } from "./stock-catalog";

/** Names for the 4a-6-2 search dropdown — derived from STOCK_CATALOG (the
 *  single source of truth that also carries market/ticker for the 4c news
 *  adapters). Hangul names only (project rule — no tickers in the UI). */
export const STOCK_MASTER: readonly string[] = STOCK_CATALOG.map((s) => s.name);
