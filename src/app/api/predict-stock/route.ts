// Step 5 / Phase 3: stock-level aggregate reaction prediction endpoint.
// POST { stockName, issues? } → StockPrediction. When `issues` is omitted the
// stock's current cached issues are used. Blends the per-issue predictions
// (confidence×importance weighted) into one net direction / band / period /
// confidence + an overall rationale.

import { NextResponse } from "next/server";
import { predictStock } from "@/lib/predict/stock";
import type { Issue } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

interface PredictStockRequest {
  stockName?: string;
  issues?: Issue[];
}

export async function POST(req: Request) {
  let body: PredictStockRequest;
  try {
    body = (await req.json()) as PredictStockRequest;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const stockName = body.stockName?.trim();
  if (!stockName) {
    return NextResponse.json({ error: "stockName required" }, { status: 400 });
  }

  try {
    const prediction = await predictStock(
      stockName,
      Array.isArray(body.issues) ? body.issues : undefined,
    );
    return NextResponse.json(prediction);
  } catch (err) {
    console.error("[/api/predict-stock] failure", err);
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
