// Step 5 / backfill: one-time historical bootstrap of the event store for US
// stocks. Per stock: resolve Yahoo symbol/sector/benchmark → Finnhub ~1yr news
// → dedupe/cap → GPT-Korean summarize → embed → compute sector-excess returns
// (Yahoo) → write event_log + event_outcome. Chunked by [offset,limit) so a
// serverless call stays within its time budget. Server-only; no-ops without
// Supabase/OpenAI/Finnhub env.

import { randomUUID } from "node:crypto";
import { STOCK_CATALOG, type StockMeta } from "@/data/stock-catalog";
import { embedTexts, summarizeToKoreanIssues } from "@/lib/openai";
import {
  type Candle,
  excessReturn,
  fetchDailyCandles,
  forwardReturn,
  resolvePriceContext,
} from "@/lib/prices";
import {
  type EventRow,
  type OutcomeRow,
  existingDedupKeys,
  insertEvents,
  insertOutcomes,
} from "@/lib/supabase/events";
import { fetchFinnhubHistory } from "./finnhub-history";

const HISTORY_DAYS = 365;
const PER_STOCK_CAP = 120; // distinct events kept per stock (evenly across the year)
const CANDLE_WINDOW_DAYS = 400; // ⊇ all article dates + forward window
const DAY_MS = 24 * 60 * 60 * 1000;

/** US catalog stocks with a ticker — the backfill universe (Step 5 decision). */
const US_STOCKS: StockMeta[] = STOCK_CATALOG.filter((s) => s.market === "US" && !!s.ticker);

/** Backfill dedup_key — based on the (stable) English title so re-runs skip
 *  already-inserted articles. Distinct from the forward pipeline's Korean-text
 *  keys; both coexist in event_log.dedup_key. */
function dedupKey(stockName: string, title: string): string {
  return `${stockName}bf:${title.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "")}`;
}

/** Evenly sample `cap` items across an oldest-first list (cover the whole year,
 *  not just the busiest weeks). */
function sampleEvenly<T>(items: T[], cap: number): T[] {
  if (items.length <= cap) return items;
  const out: T[] = [];
  const step = items.length / cap;
  for (let i = 0; i < cap; i++) out.push(items[Math.floor(i * step)]);
  return out;
}

interface StockResult {
  name: string;
  articles?: number;
  fresh?: number;
  inserted?: number;
  error?: string;
}

async function backfillOne(
  meta: StockMeta,
  benchCache: Map<string, Candle[]>,
): Promise<StockResult> {
  const ctx = await resolvePriceContext(meta.name, "US", meta.ticker);
  if (!ctx?.symbol || !ctx.benchmark) return { name: meta.name, error: "no-context" };

  const articles = sampleEvenly(
    await fetchFinnhubHistory(meta.ticker as string, HISTORY_DAYS),
    PER_STOCK_CAP,
  );
  if (articles.length === 0) return { name: meta.name, articles: 0 };

  // Skip already-backfilled articles before spending GPT/embeddings.
  const keyed = articles.map((a) => ({ a, key: dedupKey(meta.name, a.title) }));
  const existing = await existingDedupKeys(keyed.map((k) => k.key));
  const fresh = keyed.filter((k) => !existing.has(k.key));
  if (fresh.length === 0) return { name: meta.name, articles: articles.length, fresh: 0 };

  // Candles once per stock; benchmark candles cached across stocks.
  const now = Date.now();
  const from = now - CANDLE_WINDOW_DAYS * DAY_MS;
  const stockCandles = await fetchDailyCandles(ctx.symbol, from, now);
  let benchCandles = benchCache.get(ctx.benchmark);
  if (!benchCandles) {
    benchCandles = await fetchDailyCandles(ctx.benchmark, from, now);
    benchCache.set(ctx.benchmark, benchCandles);
  }
  if (stockCandles.length === 0 || benchCandles.length === 0) {
    return { name: meta.name, error: "no-candles" };
  }

  const koreanIssues = await summarizeToKoreanIssues(fresh.map((f) => f.a.title));
  const embeddings = await embedTexts(koreanIssues);
  if (embeddings.length !== fresh.length) return { name: meta.name, error: "embed-misalign" };

  const events: EventRow[] = [];
  const outcomes: OutcomeRow[] = [];
  for (let i = 0; i < fresh.length; i++) {
    const a = fresh[i].a;
    const t0ms = Date.parse(a.publishedAt);
    if (Number.isNaN(t0ms)) continue;
    const ab5 = excessReturn(stockCandles, benchCandles, t0ms, 5);
    if (ab5 === null) continue; // not labelable (too recent / data gap) — skip
    const id = randomUUID();
    events.push({
      id,
      stock_name: meta.name,
      market: "US",
      symbol: ctx.symbol,
      sector: ctx.sector,
      industry: ctx.industry,
      benchmark: ctx.benchmark,
      issue_text: koreanIssues[i],
      source_url: a.url,
      t0: a.publishedAt,
      embedding: JSON.stringify(embeddings[i]),
      dedup_key: fresh[i].key,
    });
    outcomes.push({
      event_id: id,
      benchmark: ctx.benchmark,
      ret_1d: forwardReturn(stockCandles, t0ms, 1),
      ret_3d: forwardReturn(stockCandles, t0ms, 3),
      ret_5d: forwardReturn(stockCandles, t0ms, 5),
      abret_1d: excessReturn(stockCandles, benchCandles, t0ms, 1),
      abret_3d: excessReturn(stockCandles, benchCandles, t0ms, 3),
      abret_5d: ab5,
    });
  }

  await insertEvents(events);
  await insertOutcomes(outcomes);
  return { name: meta.name, articles: articles.length, fresh: fresh.length, inserted: events.length };
}

export async function backfillStocks(offset: number, limit: number) {
  const slice = US_STOCKS.slice(offset, offset + limit);
  const benchCache = new Map<string, Candle[]>();
  const results: StockResult[] = [];
  for (const meta of slice) {
    try {
      results.push(await backfillOne(meta, benchCache));
    } catch (e) {
      // Isolate per-stock failures so one bad stock doesn't abort the chunk.
      results.push({ name: meta.name, error: e instanceof Error ? e.message.slice(0, 80) : "error" });
    }
  }
  const next = offset + limit;
  return {
    universe: US_STOCKS.length,
    offset,
    processed: slice.length,
    nextOffset: next < US_STOCKS.length ? next : null,
    results,
  };
}
