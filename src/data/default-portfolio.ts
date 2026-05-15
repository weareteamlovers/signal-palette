import type { Portfolio, Signal, Issue } from "@/types";

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
  "아스트라 랩스",
  "콴타 서비시스",
  "크라우드스트라이크 홀딩스",
] as const;

// --- Mock data for Step 1 (replaced by OpenAI in Step 3) ---

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

function makeMockIssues(seed: number): Issue[] {
  const counts = [
    { signal: "positive" as Signal, n: 6 + (seed % 5) },
    { signal: "neutral" as Signal, n: 3 + ((seed + 1) % 4) },
    { signal: "negative" as Signal, n: 2 + ((seed + 2) % 4) },
  ];
  const out: Issue[] = [];
  for (const { signal, n } of counts) {
    const pool = MOCK_KEYWORDS[signal];
    for (let i = 0; i < n; i += 1) {
      out.push({ signal, text: pool[(seed + i) % pool.length] });
    }
  }
  return out.slice(0, 20);
}

function makeOverall(issues: Issue[]): Signal {
  const score = issues.reduce(
    (s, i) => s + (i.signal === "positive" ? 1 : i.signal === "negative" ? -1 : 0),
    0,
  );
  if (score >= 3) return "positive";
  if (score <= -3) return "negative";
  return "neutral";
}

export const DEFAULT_PORTFOLIOS: Portfolio[] = [
  {
    label: "현재 포트폴리오",
    variant: "current",
    stocks: CURRENT_STOCK_NAMES.map((name, i) => {
      const issues = makeMockIssues(i + 1);
      return { name, issues, overall: makeOverall(issues) };
    }),
    overall: "positive",
  },
  {
    label: "예비 포트폴리오",
    variant: "spare",
    stocks: SPARE_STOCK_NAMES.map((name, i) => {
      const issues = makeMockIssues(i + 5);
      return { name, issues, overall: makeOverall(issues) };
    }),
    overall: "neutral",
  },
];
