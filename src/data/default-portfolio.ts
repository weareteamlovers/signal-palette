import type { Intensity, Issue, OverallSignal, Portfolio, Signal, Stock } from "@/types";

// Default portfolio names — provided by user. Use Korean names as-is, no tickers.
export const CURRENT_STOCK_NAMES = [
  "마이크론 테크놀로지",
  "ASML 홀딩(ADR)",
  "엔비디아",
  "블룸에너지",
  "비스트라 에너지",
  "TSMC(ADR)",
  "브로드컴",
  "버티브 홀딩스",
] as const;

export const SPARE_STOCK_NAMES = [
  "삼성전자",
  "SK하이닉스",
  "아마존",
  "팔란티어",
  "일라이 릴리",
  "아스테라 랩스",
  "콴타 서비시스",
  "크라우드스트라이크 홀딩스",
] as const;

// --- Mock data — used only as a per-stock fallback when /api/analyze fails. ---

const MOCK_KEYWORDS: Record<Signal, string[]> = {
  positive: [
    "AI 수요 폭증",
    "어닝 서프라이즈",
    "신제품 호평",
    "공급 계약 체결",
    "분기 매출 사상 최대",
    "마진 개선",
    "기관 매수세 유입",
    "기술력 검증",
  ],
  neutral: [
    "거래량 평이",
    "업황 관망세",
    "정책 영향 제한적",
    "분기 가이던스 유지",
    "환율 변동성 주시",
    "경쟁사 동향 확인",
  ],
  negative: [
    "실적 하향 우려",
    "공급 과잉",
    "규제 리스크",
    "주요 고객사 이탈",
    "마진 압박",
    "기술 결함 보도",
  ],
};

/** GPT returns issues in this exact bucket order; mock fallback mirrors it so
 *  the live ↔ fallback transition does not visually reshuffle a card. */
const STRENGTH_ORDER: ReadonlyArray<{ signal: Signal; intensity: Intensity }> = [
  { signal: "positive", intensity: "strong" },
  { signal: "positive", intensity: "mid" },
  { signal: "positive", intensity: "mild" },
  { signal: "neutral", intensity: "mid" },
  { signal: "negative", intensity: "mild" },
  { signal: "negative", intensity: "mid" },
  { signal: "negative", intensity: "strong" },
];

function makeMockIssues(seed: number): Issue[] {
  const out: Issue[] = [];
  for (let bucket = 0; bucket < STRENGTH_ORDER.length; bucket += 1) {
    const { signal, intensity } = STRENGTH_ORDER[bucket];
    const n = 1 + ((seed + bucket) % 3); // 1..3 per bucket
    const pool = MOCK_KEYWORDS[signal];
    for (let i = 0; i < n; i += 1) {
      out.push({ text: pool[(seed + i + bucket) % pool.length], signal, intensity });
    }
  }
  return out.slice(0, 20);
}

function makeOverall(issues: Issue[]): OverallSignal {
  // Mock fallback only — the real Stock.overall comes from GPT.
  const score = issues.reduce(
    (s, i) => s + (i.signal === "positive" ? 1 : i.signal === "negative" ? -1 : 0),
    0,
  );
  if (score >= 5) return { signal: "positive", intensity: "strong" };
  if (score >= 2) return { signal: "positive", intensity: "mid" };
  if (score >= 1) return { signal: "positive", intensity: "mild" };
  if (score <= -5) return { signal: "negative", intensity: "strong" };
  if (score <= -2) return { signal: "negative", intensity: "mid" };
  if (score <= -1) return { signal: "negative", intensity: "mild" };
  return { signal: "neutral", intensity: "mid" };
}

export const DEFAULT_PORTFOLIOS: Portfolio[] = [
  {
    label: "현재 포트폴리오",
    variant: "current",
    stocks: CURRENT_STOCK_NAMES.map((name, i) => {
      const issues = makeMockIssues(i + 1);
      return { name, issues, overall: makeOverall(issues) };
    }),
    overall: { signal: "positive", intensity: "mid" },
  },
  {
    label: "예비 포트폴리오",
    variant: "spare",
    stocks: SPARE_STOCK_NAMES.map((name, i) => {
      const issues = makeMockIssues(i + 5);
      return { name, issues, overall: makeOverall(issues) };
    }),
    overall: { signal: "neutral", intensity: "mid" },
  },
];

/** Per-stock fallback used when /api/analyze fails for a stock. Returns a
 *  fresh Stock object based on the deterministic mock issues for that name. */
export function getMockStock(name: string): Stock {
  for (const p of DEFAULT_PORTFOLIOS) {
    const s = p.stocks.find((s) => s.name === name);
    if (s) return s;
  }
  return { name, issues: [], overall: { signal: "neutral", intensity: "mid" } };
}
