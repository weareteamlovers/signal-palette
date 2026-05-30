/** Static stock catalog for the 4a-6-2 search dropdown.
 *
 *  Hangul names only (project rule — no tickers). Mix of KR + US blue chips
 *  popular with retail investors. Step 4e will replace this fixture with a
 *  real lookup API (Naver autocomplete + Finnhub /search + KRX fallback). */
export const STOCK_MASTER: readonly string[] = [
  // --- Korean equities -------------------------------------------------------
  "삼성전자",
  "SK하이닉스",
  "LG에너지솔루션",
  "현대차",
  "기아",
  "카카오",
  "네이버",
  "셀트리온",
  "삼성바이오로직스",
  "카카오뱅크",
  "카카오게임즈",
  "KB금융",
  "포스코홀딩스",
  "한국전력",
  "코웨이",

  // --- US equities (already represented in the default portfolio) -----------
  "마이크론 테크놀로지",
  "ASML 홀딩(ADR)",
  "엔비디아",
  "블룸에너지",
  "비스트라 에너지",
  "TSMC(ADR)",
  "브로드컴",
  "버티브 홀딩스",
  "아마존",
  "팔란티어",
  "일라이 릴리",
  "아스트라 랩스",
  "콴타 서비시스",
  "크라우드스트라이크 홀딩스",

  // --- US equities (extra blue chips) ----------------------------------------
  "애플",
  "마이크로소프트",
  "알파벳(구글)",
  "메타 플랫폼",
  "테슬라",
  "넷플릭스",
  "AMD",
  "인텔",
  "오라클",
  "세일즈포스",
  "IBM",
] as const;
