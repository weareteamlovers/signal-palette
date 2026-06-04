// Step 4c-7: scheduled cache warmer. Vercel Cron (vercel.json, every 5 min)
// hits this with `Authorization: Bearer ${CRON_SECRET}`. Each tick refreshes
// the K stalest in-use stocks whose cache is older than the cadence policy
// (src/lib/refresh-schedule.ts). Clients then read warm rows + Realtime (4c-8)
// instead of triggering OpenAI on load.

import { NextResponse } from "next/server";
import { metaOf, type Market } from "@/data/stock-catalog";
import { CACHE_MAX_ISSUES, refreshStock } from "@/lib/analyze";
import { captureIssues } from "@/lib/events/capture";
import { labelDueEvents } from "@/lib/events/label";
import {
  REFRESH_MODE,
  SCHEDULE,
  activeMarkets,
  desiredIntervalMsFor,
} from "@/lib/refresh-schedule";
import {
  listInUseStockNames,
  readStockMetaMany,
  selectStaleStockNames,
  writeCachedAnalysis,
} from "@/lib/supabase/analysis-cache";

// Step 5 / Phase 1: events to attempt labeling per tick (Yahoo fetches + math,
// no GPT — cheap relative to the refresh batch).
const LABEL_BATCH = 30;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// classify is slow (~10–30s/stock); allow headroom for the parallel batch.
// Requires Vercel Pro (Hobby caps function duration at 10s).
export const maxDuration = 300;

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const names = await listInUseStockNames();
  // Per-market staleness: each stock uses its own market's cadence (fast only
  // while that market is open). Resolve market like the news router: static
  // catalog (sync) → stock_meta (search-populated) → KR default — so searched
  // US stocks refresh on US hours, not KR (Step 4e).
  const metaMap = await readStockMetaMany(names.filter((n) => !metaOf(n)));
  const marketFor = (name: string): Market =>
    metaOf(name)?.market ?? metaMap.get(name)?.market ?? "KR";
  const thresholdFor = (name: string) => desiredIntervalMsFor(marketFor(name), now);
  const stale = await selectStaleStockNames(names, thresholdFor, SCHEDULE.batchSize);

  const settled = await Promise.allSettled(
    stale.map(async (name) => {
      const result = await refreshStock(name, CACHE_MAX_ISSUES);
      await writeCachedAnalysis(name, result.issues, result.overall);
      // Step 5: log any new issues to the event store (idempotent, best-effort).
      await captureIssues(name, result.issues);
    }),
  );
  const refreshed = stale.filter((_, i) => settled[i].status === "fulfilled");
  const failed = stale.filter((_, i) => settled[i].status === "rejected");
  if (failed.length) console.warn("[refresh] failed:", failed.join(", "));

  // Step 5: label events that have now aged enough for a forward-return window.
  const labeling = await labelDueEvents(LABEL_BATCH);

  return NextResponse.json({
    mode: REFRESH_MODE,
    activeMarkets: activeMarkets(now),
    candidates: names.length,
    refreshed,
    failed,
    labeling,
  });
}
