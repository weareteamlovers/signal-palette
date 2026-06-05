// Step 5 / Phase 2: issue-level reaction prediction core. Embed the issue →
// retrieve similar LABELED events (this stock first, then sector fallback) →
// aggregate their realized excess returns into direction / band / period /
// confidence → have the LLM narrate the rationale (numbers stay deterministic).
// Cold start (too few similar cases) returns an honest low-confidence result.
//
// The retrieval+aggregate step is split out as predictIssueCore so the
// stock-level predictor (Phase 3) can reuse it per issue with a single batch
// embedding and one overall LLM call. Server-only.

import { metaOf } from "@/data/stock-catalog";
import { embedTexts, narratePrediction, type NarrateInput } from "@/lib/openai";
import { resolvePriceContext } from "@/lib/prices";
import { readStockMeta } from "@/lib/supabase/analysis-cache";
import { matchEvents, type NeighborEvent } from "@/lib/supabase/events";
import { aggregateNeighbors, type Aggregation } from "./aggregate";
import type { IssuePrediction, PredictDirection, PredictScope } from "./types";

const K = 30; // neighbors retrieved per scope
const SIM_FLOOR = 0.35; // min cosine similarity to count as "similar"
const MIN_STOCK = 5; // stock-scope needs this many similar labeled cases
const MIN_USABLE = 3; // below this (even at sector scope) → cold start

export const DIRECTION_KO: Record<PredictDirection, string> = {
  up: "상승",
  down: "하락",
  neutral: "중립",
};

export function pct(x: number): string {
  return `${x >= 0 ? "+" : ""}${(x * 100).toFixed(1)}%`;
}

/** Retrieval + aggregation for one issue, no LLM. */
export interface IssueCore {
  scope: PredictScope;
  neighbors: NeighborEvent[];
  agg: Aggregation;
  sector?: string;
}

/** Sector for the sector-scope fallback when the stock has no events yet:
 *  resolved via the price layer (Naver/Yahoo, cached). */
async function resolveStockSector(stockName: string): Promise<string | undefined> {
  const cat = metaOf(stockName);
  const stored = cat ? null : await readStockMeta(stockName);
  const market = cat?.market ?? stored?.market ?? "KR";
  const ticker = cat?.ticker ?? stored?.ticker;
  const ctx = await resolvePriceContext(stockName, market, ticker);
  return ctx?.sector ?? undefined;
}

/** Embed-then-retrieve core: stock scope first, sector fallback, else cold. */
export async function predictIssueCore(
  stockName: string,
  embedding: number[],
): Promise<IssueCore> {
  const rawStock = await matchEvents(embedding, { stock: stockName, limit: K });
  const stockN = rawStock.filter((n) => n.similarity >= SIM_FLOOR);
  if (stockN.length >= MIN_STOCK) {
    return {
      scope: "stock",
      neighbors: stockN,
      agg: aggregateNeighbors(stockN),
      sector: rawStock.find((n) => n.sector)?.sector ?? undefined,
    };
  }

  const sector =
    rawStock.find((n) => n.sector)?.sector ?? (await resolveStockSector(stockName));
  const rawSector = sector
    ? await matchEvents(embedding, { sector, limit: K })
    : [];
  const sectorN = rawSector.filter((n) => n.similarity >= SIM_FLOOR);
  if (sectorN.length >= MIN_USABLE) {
    return { scope: "sector", neighbors: sectorN, agg: aggregateNeighbors(sectorN), sector };
  }

  const neighbors = sectorN.length >= stockN.length ? sectorN : stockN;
  return { scope: "none", neighbors, agg: aggregateNeighbors(neighbors), sector };
}

/** Build the public IssuePrediction from a core: cold-start handling +
 *  LLM rationale (template fallback). */
async function finalize(
  stockName: string,
  issueText: string,
  core: IssueCore,
): Promise<IssuePrediction> {
  const { scope, neighbors, agg } = core;

  if (scope === "none" || agg.sampleSize < MIN_USABLE) {
    return {
      stockName,
      issueText,
      scope: "none",
      sampleSize: agg.sampleSize,
      direction: "neutral",
      band: null,
      primaryHorizon: agg.primaryHorizon,
      impactPeriod: null,
      confidence: "low",
      horizons: agg.horizons,
      rationale: `유사한 과거 사례가 아직 충분하지 않습니다 (${agg.sampleSize}건). 이벤트가 더 쌓이면 예측 정확도가 올라갑니다.`,
    };
  }

  const directionKo = DIRECTION_KO[agg.direction];
  const sector = neighbors.find((n) => n.sector)?.sector ?? core.sector;
  const narrateInput: NarrateInput = {
    stockName,
    issueText,
    sector: sector ?? undefined,
    scope,
    directionKo,
    bandPct: agg.band ? { low: pct(agg.band.low), high: pct(agg.band.high) } : undefined,
    impactPeriod: agg.impactPeriod ?? undefined,
    sampleSize: agg.sampleSize,
    agreeCount: agg.agreeCount,
    examples: neighbors.slice(0, 3).map((n) => n.issue_text),
  };
  let rationale: string;
  try {
    rationale = await narratePrediction(narrateInput);
  } catch {
    const scopeKo = scope === "stock" ? "이 종목" : "동일 섹터";
    rationale = `과거 ${scopeKo}의 유사 이슈 ${agg.sampleSize}건 중 ${agg.agreeCount}건에서 ${agg.primaryHorizon}거래일 기준 섹터 대비 초과수익이 ${directionKo} 방향이었습니다.`;
  }

  return {
    stockName,
    issueText,
    scope,
    sampleSize: agg.sampleSize,
    direction: agg.direction,
    band: agg.band,
    primaryHorizon: agg.primaryHorizon,
    impactPeriod: agg.impactPeriod,
    confidence: agg.confidence,
    horizons: agg.horizons,
    rationale,
  };
}

export async function predictIssue(
  stockName: string,
  issueText: string,
): Promise<IssuePrediction> {
  const [embedding] = await embedTexts([issueText]);
  const core = await predictIssueCore(stockName, embedding);
  return finalize(stockName, issueText, core);
}
