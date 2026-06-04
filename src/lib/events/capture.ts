// Step 5 / Phase 1: log new issues to the permanent event store the moment they
// first appear. For each distinct issue it resolves the stock's Yahoo
// symbol/sector/benchmark (so the labeler can later measure the reaction),
// embeds the issue text (for Phase 2 retrieval), and inserts one row keyed by
// dedup_key. Idempotent + best-effort: no Supabase/OpenAI env → no-op. Only
// issues with a usable createdAt (t0) are logged — an event needs a real
// timestamp to be labelable.

import { metaOf } from "@/data/stock-catalog";
import { embedTexts } from "@/lib/openai";
import { resolvePriceContext } from "@/lib/prices";
import { readStockMeta } from "@/lib/supabase/analysis-cache";
import { existingDedupKeys, insertEvents, type EventRow } from "@/lib/supabase/events";
import type { Issue } from "@/types";

/** Stable key for one issue: stock + normalized text (whitespace/punctuation
 *  stripped) so trivial rephrasings of the same issue don't double-log. */
function dedupKey(stockName: string, text: string): string {
  const norm = text.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
  return `${stockName}${norm}`;
}

export async function captureIssues(stockName: string, issues: Issue[]): Promise<void> {
  // An event needs a real timestamp to be labelable later.
  const dated = issues.filter((i) => i.createdAt && i.text.trim());
  if (dated.length === 0) return;

  // First appearance only — skip issues already in the log.
  const keyed = dated.map((i) => ({ issue: i, key: dedupKey(stockName, i.text) }));
  const existing = await existingDedupKeys(keyed.map((k) => k.key));
  const fresh = keyed.filter((k) => !existing.has(k.key));
  if (fresh.length === 0) return;

  // Resolve once per stock: market/ticker (catalog → stock_meta → KR), then the
  // Yahoo symbol/sector/benchmark used to label the reaction.
  const cat = metaOf(stockName);
  const stored = cat ? null : await readStockMeta(stockName);
  const market = cat?.market ?? stored?.market ?? "KR";
  const ticker = cat?.ticker ?? stored?.ticker;
  const ctx = await resolvePriceContext(stockName, market, ticker);

  let embeddings: number[][];
  try {
    embeddings = await embedTexts(fresh.map((k) => k.issue.text));
  } catch (e) {
    console.warn(`[events] embed failed for "${stockName}"`, e);
    return;
  }
  if (embeddings.length !== fresh.length) return;

  const rows: EventRow[] = fresh.map((k, i) => ({
    stock_name: stockName,
    market,
    symbol: ctx?.symbol,
    sector: ctx?.sector,
    industry: ctx?.industry,
    benchmark: ctx?.benchmark,
    issue_text: k.issue.text,
    signal: k.issue.signal,
    intensity: k.issue.intensity,
    source_url: k.issue.source?.url,
    t0: k.issue.createdAt as string,
    embedding: JSON.stringify(embeddings[i]),
    dedup_key: k.key,
  }));

  await insertEvents(rows);
}
