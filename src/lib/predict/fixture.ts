// Step 5 / Phase 4: deterministic mock stock prediction for fixture mode, so
// the prediction block renders fully (matching the Figma design) locally and in
// demos without any event data. Client-safe (pure). Live mode calls the real
// /api/predict-stock instead. Direction comes from the stock's own issue
// signals; the band/period are direction-based; the narrative is templated
// from the actual top issues (so each stock reads differently).

import type { Issue } from "@/types";
import { formatBandPct } from "./format";
import type { IssuePredictionSummary, PredictDirection, StockPrediction } from "./types";

const INTENSITY_W: Record<string, number> = { strong: 3, mid: 2, mild: 1 };

function byImportance(a: Issue, b: Issue): number {
  return (a.importance ?? 99) - (b.importance ?? 99);
}

function narrate(
  stock: string,
  issues: Issue[],
  dir: PredictDirection,
  band: { low: number; high: number },
  period: { from: number; to: number },
): string {
  const bandStr = formatBandPct(band);
  const periodStr = `${period.from}~${period.to}거래일`;
  const downs = issues.filter((i) => i.signal === "negative").sort(byImportance);
  const ups = issues.filter((i) => i.signal === "positive").sort(byImportance);

  if (dir === "down") {
    const lead = downs.slice(0, 2).map((i) => i.text).join(", ") || "여러 부정적 이슈";
    const counter = ups[0]
      ? ` 반면 ${ups[0].text} 등이 일부 상승 압력으로 작용할 수 있으나 부정적 요인이 우세합니다.`
      : "";
    return `${stock}는 ${lead} 등 하락 압력이 우세하여 하락세를 보일 것으로 예상됩니다.${counter} 향후 ${periodStr} 동안 섹터 대비 ${bandStr}의 초과수익이 예상됩니다.`;
  }
  if (dir === "up") {
    const lead = ups.slice(0, 2).map((i) => i.text).join(", ") || "여러 긍정적 이슈";
    const counter = downs[0]
      ? ` 다만 ${downs[0].text} 등은 하락 요인이나 긍정적 요인이 우세합니다.`
      : "";
    return `${stock}는 ${lead} 등 상승 압력이 우세하여 상승세를 보일 것으로 예상됩니다.${counter} 향후 ${periodStr} 동안 섹터 대비 ${bandStr}의 초과수익이 예상됩니다.`;
  }
  return `${stock}의 현재 이슈들은 상승·하락 요인이 혼재해 뚜렷한 방향성은 약합니다. 향후 ${periodStr} 동안 섹터 대비 ${bandStr} 내외의 변동이 예상됩니다.`;
}

export function mockStockPrediction(stockName: string, issues: Issue[]): StockPrediction {
  const usable = issues.filter((i) => i.text && i.text.trim());
  let score = 0;
  for (const i of usable) {
    const w = INTENSITY_W[i.intensity] ?? 1;
    if (i.signal === "positive") score += w;
    else if (i.signal === "negative") score -= w;
  }
  const norm = usable.length ? score / usable.length : 0;
  const direction: PredictDirection = norm > 0.3 ? "up" : norm < -0.3 ? "down" : "neutral";
  const band =
    direction === "up"
      ? { low: 0.004, high: 0.026 }
      : direction === "down"
        ? { low: -0.026, high: -0.004 }
        : { low: -0.008, high: 0.012 };
  const impactPeriod = direction === "neutral" ? { from: 1, to: 3 } : { from: 3, to: 5 };

  const summaries: IssuePredictionSummary[] = usable.map((i) => ({
    issueText: i.text,
    importance: i.importance,
    scope: "sector",
    direction: i.signal === "positive" ? "up" : i.signal === "negative" ? "down" : "neutral",
    band: null,
    confidence: "medium",
    sampleSize: 9,
  }));

  return {
    stockName,
    direction,
    band,
    primaryHorizon: 3,
    impactPeriod,
    confidence: "medium",
    horizons: [1, 3, 5].map((d) => ({
      tradingDays: d,
      center: (band.low + band.high) / 2,
      low: band.low,
      high: band.high,
    })),
    totalIssues: usable.length,
    contributingIssues: usable.length,
    rationale: narrate(stockName, usable, direction, band, impactPeriod),
    issues: summaries,
  };
}
