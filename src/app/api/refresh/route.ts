// Step 4c-7: scheduled cache warmer. Vercel Cron (vercel.json, every 5 min)
// hits this with `Authorization: Bearer ${CRON_SECRET}`. Each tick refreshes
// the K stalest in-use stocks whose cache is older than the cadence policy
// (src/lib/refresh-schedule.ts). Clients then read warm rows + Realtime (4c-8)
// instead of triggering OpenAI on load.

import { NextResponse } from "next/server";
import { marketOf } from "@/data/stock-catalog";
import { CACHE_MAX_ISSUES, computeStock } from "@/lib/analyze";
import {
  REFRESH_MODE,
  SCHEDULE,
  activeMarkets,
  desiredIntervalMsFor,
} from "@/lib/refresh-schedule";
import {
  listInUseStockNames,
  selectStaleStockNames,
  writeCachedAnalysis,
} from "@/lib/supabase/analysis-cache";

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
  // while that market is open), so KR and US refresh on independent clocks.
  const thresholdFor = (name: string) => desiredIntervalMsFor(marketOf(name), now);
  const stale = await selectStaleStockNames(names, thresholdFor, SCHEDULE.batchSize);

  const settled = await Promise.allSettled(
    stale.map(async (name) => {
      const result = await computeStock(name, CACHE_MAX_ISSUES);
      await writeCachedAnalysis(name, result.issues, result.overall);
    }),
  );
  const refreshed = stale.filter((_, i) => settled[i].status === "fulfilled");
  const failed = stale.filter((_, i) => settled[i].status === "rejected");
  if (failed.length) console.warn("[refresh] failed:", failed.join(", "));

  return NextResponse.json({
    mode: REFRESH_MODE,
    activeMarkets: activeMarkets(now),
    candidates: names.length,
    refreshed,
    failed,
  });
}
