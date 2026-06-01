import { NextResponse } from "next/server";
import { fetchArticles } from "@/lib/news";
import {
  analyzePortfolioOverall,
  analyzeStock,
  classifyArticles,
  RECENCY_DAYS,
} from "@/lib/openai";
import { readCachedAnalysis, writeCachedAnalysis } from "@/lib/supabase/analysis-cache";
import type { Stock } from "@/types";

// Forced dynamic so Next never tries to cache or statically render this route.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Step 4c: opt-in news-adapter pipeline (adapters fetch real articles → GPT
// classifies them, no web_search). Off by default so the live path is
// unchanged; flip USE_NEWS_ADAPTERS=true in the env to try it.
const USE_NEWS_ADAPTERS = process.env.USE_NEWS_ADAPTERS === "true";

// Always compute/cache the full set; the client trims for mobile.
const CACHE_MAX_ISSUES = 20;

// Step 4c-6 read-through cache TTL. Override with STOCK_CACHE_TTL_MS (set 0 to
// effectively disable the read cache while keeping writes warm). Default 3h.
function cacheTtlMs(): number {
  const raw = process.env.STOCK_CACHE_TTL_MS;
  if (raw !== undefined && raw !== "" && !Number.isNaN(Number(raw))) return Number(raw);
  return 3 * 60 * 60 * 1000;
}

async function computeStock(stockName: string, maxIssues: number) {
  if (USE_NEWS_ADAPTERS) {
    const articles = await fetchArticles(stockName, RECENCY_DAYS);
    return classifyArticles(stockName, articles, maxIssues);
  }
  return analyzeStock(stockName, maxIssues);
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
  return { issues: result.issues.slice(0, maxIssues), overall: result.overall };
}

interface StockRequest {
  type: "stock";
  stockName: string;
  /** Maximum number of issues to return. Defaults to 20 (desktop/tablet grid).
   *  Mobile sends 10 because the card only shows a 5×2 grid. */
  maxIssues?: number;
}

interface PortfolioRequest {
  type: "portfolio-overall";
  label: string;
  stocks: Stock[];
}

type AnalyzeRequest = StockRequest | PortfolioRequest;

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

    if (body.type === "portfolio-overall") {
      if (typeof body.label !== "string" || !Array.isArray(body.stocks)) {
        return NextResponse.json(
          { error: "label and stocks[] required" },
          { status: 400 },
        );
      }
      const overall = await analyzePortfolioOverall(body.label, body.stocks);
      return NextResponse.json({ overall });
    }

    return NextResponse.json({ error: "unknown type" }, { status: 400 });
  } catch (err) {
    console.error("[/api/analyze] failure", err);
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
