import { NextResponse } from "next/server";
import { analyzePortfolioOverall, analyzeStock } from "@/lib/openai";
import type { Stock } from "@/types";

// Forced dynamic so Next never tries to cache or statically render this route.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface StockRequest {
  type: "stock";
  stockName: string;
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
      const result = await analyzeStock(body.stockName);
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
