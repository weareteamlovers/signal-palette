/** Structured stock catalog — single source of truth for the search dropdown
 *  (names only) and the Step 4c news adapters (market routing + US tickers).
 *
 *  Project rule: Hangul display names, no tickers in the UI. The `ticker` here
 *  is internal metadata only — US adapters (Finnhub/Yahoo) need a symbol; KR
 *  adapters (Naver/Google RSS) query by the Korean name so KR rows omit it.
 *
 *  Step 4e will replace this fixture with a real lookup API (Naver
 *  autocomplete + Finnhub /search + KRX fallback). */

export type Market = "KR" | "US";

export interface StockMeta {
  /** Korean display name (UI). */
  name: string;
  market: Market;
  /** US trading symbol — required for Finnhub/Yahoo, omitted for KR. */
  ticker?: string;
}

export const STOCK_CATALOG: readonly StockMeta[] = [
  // --- Korean equities (Naver / Google RSS query by name) -------------------
  { name: "삼성전자", market: "KR" },
  { name: "SK하이닉스", market: "KR" },
  { name: "LG에너지솔루션", market: "KR" },
  { name: "현대차", market: "KR" },
  { name: "기아", market: "KR" },
  { name: "카카오", market: "KR" },
  { name: "네이버", market: "KR" },
  { name: "셀트리온", market: "KR" },
  { name: "삼성바이오로직스", market: "KR" },
  { name: "카카오뱅크", market: "KR" },
  { name: "카카오게임즈", market: "KR" },
  { name: "KB금융", market: "KR" },
  { name: "포스코홀딩스", market: "KR" },
  { name: "한국전력", market: "KR" },
  { name: "코웨이", market: "KR" },

  // --- US equities (default portfolio) — ticker drives Finnhub/Yahoo --------
  { name: "마이크론 테크놀로지", market: "US", ticker: "MU" },
  { name: "ASML 홀딩(ADR)", market: "US", ticker: "ASML" },
  { name: "엔비디아", market: "US", ticker: "NVDA" },
  { name: "블룸에너지", market: "US", ticker: "BE" },
  { name: "비스트라 에너지", market: "US", ticker: "VST" },
  { name: "TSMC(ADR)", market: "US", ticker: "TSM" },
  { name: "브로드컴", market: "US", ticker: "AVGO" },
  { name: "버티브 홀딩스", market: "US", ticker: "VRT" },
  { name: "아마존", market: "US", ticker: "AMZN" },
  { name: "팔란티어", market: "US", ticker: "PLTR" },
  { name: "일라이 릴리", market: "US", ticker: "LLY" },
  { name: "아스트라 랩스", market: "US", ticker: "ALAB" },
  { name: "콴타 서비시스", market: "US", ticker: "PWR" },
  { name: "크라우드스트라이크 홀딩스", market: "US", ticker: "CRWD" },

  // --- US equities (extra blue chips) ---------------------------------------
  { name: "애플", market: "US", ticker: "AAPL" },
  { name: "마이크로소프트", market: "US", ticker: "MSFT" },
  { name: "알파벳(구글)", market: "US", ticker: "GOOGL" },
  { name: "메타 플랫폼", market: "US", ticker: "META" },
  { name: "테슬라", market: "US", ticker: "TSLA" },
  { name: "넷플릭스", market: "US", ticker: "NFLX" },
  { name: "AMD", market: "US", ticker: "AMD" },
  { name: "인텔", market: "US", ticker: "INTC" },
  { name: "오라클", market: "US", ticker: "ORCL" },
  { name: "세일즈포스", market: "US", ticker: "CRM" },
  { name: "IBM", market: "US", ticker: "IBM" },
];

const BY_NAME = new Map(STOCK_CATALOG.map((s) => [s.name, s]));

export function metaOf(name: string): StockMeta | undefined {
  return BY_NAME.get(name);
}

/** Market for a name. Unknown names default to KR — Naver/Google RSS query by
 *  the Korean name works regardless, and we have no US ticker for them. */
export function marketOf(name: string): Market {
  return BY_NAME.get(name)?.market ?? "KR";
}

export function tickerOf(name: string): string | undefined {
  return BY_NAME.get(name)?.ticker;
}
