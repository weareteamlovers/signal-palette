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
  // 4e-2: major KOSPI names for the default browse (curated; names via Naver).
  { name: "신한지주", market: "KR" },
  { name: "삼성SDI", market: "KR" },
  { name: "현대모비스", market: "KR" },
  { name: "LG화학", market: "KR" },
  { name: "삼성물산", market: "KR" },
  { name: "SK이노베이션", market: "KR" },
  { name: "삼성생명", market: "KR" },
  { name: "SK텔레콤", market: "KR" },
  { name: "KT&G", market: "KR" },
  { name: "하나금융지주", market: "KR" },
  { name: "HD현대중공업", market: "KR" },
  { name: "두산에너빌리티", market: "KR" },
  { name: "삼성화재", market: "KR" },
  { name: "LG전자", market: "KR" },
  { name: "우리금융지주", market: "KR" },
  { name: "크래프톤", market: "KR" },
  { name: "고려아연", market: "KR" },
  { name: "삼성전기", market: "KR" },
  { name: "KT", market: "KR" },
  { name: "현대글로비스", market: "KR" },
  { name: "삼성에스디에스", market: "KR" },
  { name: "롯데케미칼", market: "KR" },
  { name: "한미반도체", market: "KR" },
  { name: "알테오젠", market: "KR" },
  { name: "에코프로비엠", market: "KR" },
  { name: "HMM", market: "KR" },
  { name: "S-Oil", market: "KR" },
  { name: "기업은행", market: "KR" },

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
  // 4e-2: major S&P names for the default browse (curated; names via Naver).
  { name: "제이피모간체이스", market: "US", ticker: "JPM" },
  { name: "비자", market: "US", ticker: "V" },
  { name: "엑슨 모빌", market: "US", ticker: "XOM" },
  { name: "유나이티드헬스 그룹", market: "US", ticker: "UNH" },
  { name: "마스터카드", market: "US", ticker: "MA" },
  { name: "코스트코 홀세일", market: "US", ticker: "COST" },
  { name: "홈디포", market: "US", ticker: "HD" },
  { name: "P&G", market: "US", ticker: "PG" },
  { name: "존슨앤드존슨", market: "US", ticker: "JNJ" },
  { name: "애브비", market: "US", ticker: "ABBV" },
  { name: "뱅크오브아메리카", market: "US", ticker: "BAC" },
  { name: "코카콜라", market: "US", ticker: "KO" },
  { name: "셰브론", market: "US", ticker: "CVX" },
  { name: "머크 앤 코", market: "US", ticker: "MRK" },
  { name: "펩시코", market: "US", ticker: "PEP" },
  { name: "써모 피셔 사이언티픽", market: "US", ticker: "TMO" },
  { name: "린드", market: "US", ticker: "LIN" },
  { name: "어도비", market: "US", ticker: "ADBE" },
  { name: "월마트", market: "US", ticker: "WMT" },
  { name: "맥도날드", market: "US", ticker: "MCD" },
  { name: "시스코 시스템즈", market: "US", ticker: "CSCO" },
  { name: "액센추어", market: "US", ticker: "ACN" },
  { name: "애보트 래보라토리", market: "US", ticker: "ABT" },
  { name: "다나허", market: "US", ticker: "DHR" },
  { name: "퀄컴", market: "US", ticker: "QCOM" },
  { name: "텍사스 인스트루먼트", market: "US", ticker: "TXN" },
  { name: "인튜이트", market: "US", ticker: "INTU" },
  { name: "버라이존", market: "US", ticker: "VZ" },
  { name: "컴캐스트", market: "US", ticker: "CMCSA" },
  { name: "필립 모리스 인터내셔널", market: "US", ticker: "PM" },
  { name: "GE 에어로스페이스", market: "US", ticker: "GE" },
  { name: "캐터필러", market: "US", ticker: "CAT" },
  { name: "서비스나우", market: "US", ticker: "NOW" },
  { name: "우버", market: "US", ticker: "UBER" },
  { name: "보잉", market: "US", ticker: "BA" },
  { name: "어플라이드 머티어리얼즈", market: "US", ticker: "AMAT" },
  { name: "화이자", market: "US", ticker: "PFE" },
  { name: "월트 디즈니", market: "US", ticker: "DIS" },
  { name: "웰스파고", market: "US", ticker: "WFC" },
  { name: "AT&T", market: "US", ticker: "T" },
];

const BY_NAME = new Map(STOCK_CATALOG.map((s) => [s.name, s]));
const BY_TICKER = new Map(
  STOCK_CATALOG.filter((s) => s.ticker).map((s) => [s.ticker as string, s]),
);

/** Catalog entry for a name (market + US ticker), or undefined if not in the
 *  static catalog. Callers fall back to stock_meta (search-populated) then KR. */
export function metaOf(name: string): StockMeta | undefined {
  return BY_NAME.get(name);
}

/** Catalog entry by ticker — used to prefer our curated Korean name over a
 *  search source's transliteration (Step 4e: 콴타 서비스 → 콴타 서비시스). */
export function metaByTicker(ticker: string): StockMeta | undefined {
  return BY_TICKER.get(ticker);
}
