import { after, NextResponse } from "next/server";
import { CACHE_MAX_ISSUES, computeStock } from "@/lib/analyze";
import { captureIssues } from "@/lib/events/capture";
import { readCachedAnalysis, writeCachedAnalysis } from "@/lib/supabase/analysis-cache";

// Forced dynamic so Next never tries to cache or statically render this route.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Step 4c-6 read-through cache TTL. Override with STOCK_CACHE_TTL_MS (set 0 to
// effectively disable the read cache while keeping writes warm). Default 3h.
function cacheTtlMs(): number {
  const raw = process.env.STOCK_CACHE_TTL_MS;
  if (raw !== undefined && raw !== "" && !Number.isNaN(Number(raw))) return Number(raw);
  return 3 * 60 * 60 * 1000;
}

/** Read-through cache: serve a fresh cached row when available, else compute
 *  the full set, cache it, and return. Cache is a no-op without Supabase env. */
async function analyzeOneStock(stockName: string, maxIssues: number) {
  const cached = await readCachedAnalysis(stockName, cacheTtlMs());
  if (cached) {
    return { issues: cached.issues.slice(0, maxIssues), overall: cached.overall };
  }
  const result = await computeStock(stockName, CACHE_MAX_ISSUES);
  await writeCachedAnalysis(stockName, result.issues, result.overall);
  // Step 5: log new issues to the event store after responding (no added
  // latency). Idempotent + best-effort.
  after(() => captureIssues(stockName, result.issues));
  return { issues: result.issues.slice(0, maxIssues), overall: result.overall };
}

interface StockRequest {
  type: "stock";
  stockName: string;
  /** Maximum number of issues to return. Defaults to 20 (desktop/tablet grid).
   *  Mobile sends 10 because the card only shows a 5×2 grid. */
  maxIssues?: number;
}

// Portfolio overall is derived client-side from the per-stock overalls
// (src/lib/overall.ts) — this route only computes single stocks now.
type AnalyzeRequest = StockRequest;

export async function POST(req: Request) {
  let body: AnalyzeRequest;
  try {
    body = (await req.json()) as AnalyzeRequest;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  try {
    if (body.type === "stock") {
      if (typeof body.stockName !== "string" || body.stockName.length === 0) {
        return NextResponse.json({ error: "stockName required" }, { status: 400 });
      }
      const maxIssues =
        typeof body.maxIssues === "number" && body.maxIssues > 0
          ? Math.min(body.maxIssues, 20)
          : 20;
      const result = await analyzeOneStock(body.stockName, maxIssues);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "unknown type" }, { status: 400 });
  } catch (err) {
    console.error("[/api/analyze] failure", err);
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
