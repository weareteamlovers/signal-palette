// Step 5 / Phase 3: stock-level aggregate prediction. Predicts each of a
// stock's current active issues (one batch embedding, no per-issue LLM), then
// blends them — confidence×importance-weighted, NOT a naive sum, so opposing
// issues offset and disagreement widens the band — and writes one overall LLM
// rationale. The colour system's "이슈 → 종목 overall" pattern, on the
// prediction axis. Server-only.

import { embedTexts, narrateStockPrediction, requestStockPredictionGpt } from "@/lib/openai";
import { readCachedAnalysis } from "@/lib/supabase/analysis-cache";
import type { Intensity, Issue, Signal } from "@/types";
import { DIRECTION_KO, pct, predictIssueCore, type IssueCore } from "./issue";
import { PREDICTION_MODE } from "./mode";
import type {
  Confidence,
  IssuePredictionSummary,
  PredictDirection,
  PredictScope,
  StockHorizon,
  StockPrediction,
} from "./types";

/** 7-level prediction color → signal/intensity + direction (GPT mode). */
const COLOR_MAP: Record<
  string,
  { signal: Signal; intensity: Intensity; direction: PredictDirection }
> = {
  positive_strong: { signal: "positive", intensity: "strong", direction: "up" },
  positive_mid: { signal: "positive", intensity: "mid", direction: "up" },
  positive_mild: { signal: "positive", intensity: "mild", direction: "up" },
  neutral: { signal: "neutral", intensity: "mid", direction: "neutral" },
  negative_mild: { signal: "negative", intensity: "mild", direction: "down" },
  negative_mid: { signal: "negative", intensity: "mid", direction: "down" },
  negative_strong: { signal: "negative", intensity: "strong", direction: "down" },
};

const HORIZONS = [1, 3, 5] as const;
const NEUTRAL_EPS = 0.003;
const MATERIAL_EPS = 0.003;
const MIN_USABLE = 3; // an issue needs this many similar labeled cases to count

const CONF_WEIGHT: Record<Confidence, number> = { high: 1, medium: 0.6, low: 0.3 };
const CONF_SCORE: Record<Confidence, number> = { high: 1, medium: 0.6, low: 0.3 };

interface BlendInput {
  importance?: number;
  scope: PredictScope;
  direction: PredictDirection;
  confidence: Confidence;
  horizons: { tradingDays: number; n: number; median: number; p25: number; p75: number }[];
}

interface StockBlend {
  direction: PredictDirection;
  band: { low: number; high: number } | null;
  primaryHorizon: number;
  impactPeriod: { from: number; to: number } | null;
  confidence: Confidence;
  horizons: StockHorizon[];
  contributingIssues: number;
  upCount: number;
  downCount: number;
}

/** Per-issue weight: confidence × importance. Cold (scope "none") issues
 *  carry no weight, so they drop out of the blend. */
export function issueWeight(i: {
  scope: PredictScope;
  confidence: Confidence;
  importance?: number;
}): number {
  if (i.scope === "none") return 0;
  const imp = i.importance && i.importance > 0 ? 1 / i.importance : 0.5;
  return CONF_WEIGHT[i.confidence] * imp;
}

function stockConfidence(n: number, agreeRate: number, meanConf: number): Confidence {
  let s = 0;
  if (meanConf >= 0.8) s += 2;
  else if (meanConf >= 0.5) s += 1;
  if (agreeRate >= 0.75) s += 2;
  else if (agreeRate >= 0.6) s += 1;
  if (n >= 3) s += 1;
  return s >= 4 ? "high" : s >= 2 ? "medium" : "low";
}

/** Blend per-issue predictions into a stock-level distribution. Pure. */
export function blendIssuePredictions(inputs: BlendInput[]): StockBlend {
  const contributors = inputs
    .map((i) => ({ ...i, w: issueWeight(i) }))
    .filter((c) => c.w > 0);

  const built = HORIZONS.map((h) => {
    const parts = contributors
      .map((c) => {
        const hs = c.horizons.find((x) => x.tradingDays === h);
        return hs && hs.n > 0
          ? { m: hs.median, hw: (hs.p75 - hs.p25) / 2, w: c.w }
          : null;
      })
      .filter((x): x is { m: number; hw: number; w: number } => x !== null);
    const W = parts.reduce((s, p) => s + p.w, 0);
    if (W === 0) {
      return { sh: { tradingDays: h, center: 0, low: 0, high: 0 }, n: 0 };
    }
    const center = parts.reduce((s, p) => s + p.w * p.m, 0) / W;
    const variance = parts.reduce((s, p) => s + p.w * (p.m - center) ** 2, 0) / W;
    const spread =
      parts.reduce((s, p) => s + p.w * p.hw, 0) / W + Math.sqrt(variance);
    return {
      sh: { tradingDays: h, center, low: center - spread, high: center + spread },
      n: parts.length,
    };
  });

  const horizons = built.map((b) => b.sh);
  const withData = built.filter((b) => b.n > 0).map((b) => b.sh);
  const primary =
    withData.length === 0
      ? horizons.find((h) => h.tradingDays === 3)!
      : withData.reduce((a, b) => (Math.abs(b.center) > Math.abs(a.center) ? b : a));

  const direction: PredictDirection =
    Math.abs(primary.center) < NEUTRAL_EPS ? "neutral" : primary.center > 0 ? "up" : "down";
  const dirSign = direction === "up" ? 1 : direction === "down" ? -1 : 0;

  const material = horizons
    .filter((h) => Math.abs(h.center) >= MATERIAL_EPS && Math.sign(h.center) === dirSign)
    .map((h) => h.tradingDays);
  const impactPeriod =
    direction === "neutral" || material.length === 0
      ? null
      : { from: Math.min(...material), to: Math.max(...material) };
  const band = direction === "neutral" ? null : { low: primary.low, high: primary.high };

  const totalW = contributors.reduce((s, c) => s + c.w, 0);
  const meanConf = totalW
    ? contributors.reduce((s, c) => s + c.w * CONF_SCORE[c.confidence], 0) / totalW
    : 0;
  const agreeRate = totalW
    ? contributors
        .filter((c) => (c.direction === "up" ? 1 : c.direction === "down" ? -1 : 0) === dirSign)
        .reduce((s, c) => s + c.w, 0) / totalW
    : 0;

  return {
    direction,
    band,
    primaryHorizon: primary.tradingDays,
    impactPeriod,
    confidence: stockConfidence(contributors.length, agreeRate, meanConf),
    horizons,
    contributingIssues: contributors.length,
    upCount: contributors.filter((c) => c.direction === "up").length,
    downCount: contributors.filter((c) => c.direction === "down").length,
  };
}

function emptyStockPrediction(
  stockName: string,
  totalIssues: number,
  rationale: string,
  issues: IssuePredictionSummary[] = [],
): StockPrediction {
  return {
    stockName,
    direction: "neutral",
    band: null,
    primaryHorizon: 3,
    impactPeriod: null,
    confidence: "low",
    horizons: HORIZONS.map((d) => ({ tradingDays: d, center: 0, low: 0, high: 0 })),
    totalIssues,
    contributingIssues: 0,
    rationale,
    issues,
  };
}

/** Resolve the stock's issues, then route to the active engine (predict/mode.ts):
 *  GPT mode = one call returns color/period/band/서술; model mode = case-based
 *  k-NN over the event store. Either result is cached per stock by the refresh
 *  job, so the modal reads a warm row (0 OpenAI on open). */
export async function predictStock(
  stockName: string,
  providedIssues?: Issue[],
): Promise<StockPrediction> {
  const issues =
    providedIssues ??
    (await readCachedAnalysis(stockName, Number.POSITIVE_INFINITY))?.issues ??
    [];
  return PREDICTION_MODE === "model"
    ? predictStockKnn(stockName, issues)
    : predictStockGpt(stockName, issues);
}

/** GPT prediction mode — one gpt-4o-mini call returns the full StockPrediction
 *  (color + impact period + band + 종합 서술). On failure falls back to a
 *  cold/empty prediction so the caller (refresh/modal) degrades cleanly. */
export async function predictStockGpt(
  stockName: string,
  issues: Issue[],
): Promise<StockPrediction> {
  const usable = issues.filter((i) => i.text && i.text.trim());
  if (usable.length === 0) {
    return emptyStockPrediction(stockName, issues.length, "분석된 이슈가 없어 종합 예측을 만들 수 없습니다.");
  }
  let raw: Awaited<ReturnType<typeof requestStockPredictionGpt>>;
  try {
    raw = await requestStockPredictionGpt(stockName, usable);
  } catch {
    return emptyStockPrediction(stockName, usable.length, "예측을 일시적으로 가져오지 못했어요.");
  }
  const m = COLOR_MAP[raw.color] ?? COLOR_MAP.neutral;
  const center = (raw.band.low + raw.band.high) / 2;
  return {
    stockName,
    direction: m.direction,
    band: raw.band,
    primaryHorizon: raw.impactPeriod.to,
    impactPeriod: raw.impactPeriod,
    confidence: raw.confidence,
    horizons: HORIZONS.map((d) => ({ tradingDays: d, center, low: raw.band.low, high: raw.band.high })),
    totalIssues: usable.length,
    contributingIssues: usable.length,
    rationale: raw.rationale,
    issues: [],
    color: { signal: m.signal, intensity: m.intensity },
  };
}

/** Case-based (k-NN) model mode — per-issue retrieval + deterministic
 *  aggregation over the event store; the LLM only narrates. */
async function predictStockKnn(
  stockName: string,
  issues: Issue[],
): Promise<StockPrediction> {
  const usable = issues.filter((i) => i.text && i.text.trim());
  if (usable.length === 0) {
    return emptyStockPrediction(stockName, issues.length, "분석된 이슈가 없어 종합 예측을 만들 수 없습니다.");
  }

  // One batch embedding for all issues; per-issue retrieval+aggregate (no LLM).
  const embeddings = await embedTexts(usable.map((i) => i.text));
  const cores: { issue: Issue; core: IssueCore }[] = [];
  for (let i = 0; i < usable.length; i++) {
    cores.push({ issue: usable[i], core: await predictIssueCore(stockName, embeddings[i]) });
  }

  const perIssue = cores.map(({ issue, core }) => {
    const cold = core.scope === "none" || core.agg.sampleSize < MIN_USABLE;
    const scope: PredictScope = cold ? "none" : core.scope;
    const direction: PredictDirection = cold ? "neutral" : core.agg.direction;
    const confidence: Confidence = cold ? "low" : core.agg.confidence;
    const summary: IssuePredictionSummary = {
      issueText: issue.text,
      importance: issue.importance,
      scope,
      direction,
      band: cold ? null : core.agg.band,
      confidence,
      sampleSize: core.agg.sampleSize,
    };
    const blendInput: BlendInput = {
      importance: issue.importance,
      scope,
      direction,
      confidence,
      horizons: core.agg.horizons,
    };
    return { issue, core, direction, summary, blendInput };
  });

  const summaries = perIssue.map((p) => p.summary);
  const blend = blendIssuePredictions(perIssue.map((p) => p.blendInput));

  if (blend.contributingIssues === 0) {
    return emptyStockPrediction(
      stockName,
      usable.length,
      `유사한 과거 사례가 충분한 이슈가 아직 없습니다 (${usable.length}개 이슈 분석). 이벤트가 더 쌓이면 종합 예측이 가능해집니다.`,
      summaries,
    );
  }

  const sector = perIssue.find((p) => p.core.sector)?.core.sector;
  const topIssues = perIssue
    .filter((p) => issueWeight(p.blendInput) > 0)
    .sort((a, b) => issueWeight(b.blendInput) - issueWeight(a.blendInput))
    .slice(0, 4)
    .map((p) => ({ text: p.issue.text, directionKo: DIRECTION_KO[p.direction] }));

  let rationale: string;
  try {
    rationale = await narrateStockPrediction({
      stockName,
      sector: sector ?? undefined,
      directionKo: DIRECTION_KO[blend.direction],
      bandPct: blend.band ? { low: pct(blend.band.low), high: pct(blend.band.high) } : undefined,
      impactPeriod: blend.impactPeriod ?? undefined,
      contributingIssues: blend.contributingIssues,
      totalIssues: usable.length,
      upCount: blend.upCount,
      downCount: blend.downCount,
      topIssues,
    });
  } catch {
    rationale = `현재 ${usable.length}개 이슈 중 ${blend.contributingIssues}개 기반 종합 예측: 순효과 ${DIRECTION_KO[blend.direction]}${
      blend.band ? ` (섹터 대비 ${pct(blend.band.low)}~${pct(blend.band.high)})` : ""
    }, 신뢰도 ${blend.confidence}.`;
  }

  return {
    stockName,
    direction: blend.direction,
    band: blend.band,
    primaryHorizon: blend.primaryHorizon,
    impactPeriod: blend.impactPeriod,
    confidence: blend.confidence,
    horizons: blend.horizons,
    totalIssues: usable.length,
    contributingIssues: blend.contributingIssues,
    rationale,
    issues: summaries,
  };
}
