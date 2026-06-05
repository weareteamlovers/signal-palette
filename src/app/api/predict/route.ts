// Step 5 / Phase 2: issue-level reaction prediction endpoint.
// POST { stockName, issueText } → IssuePrediction (direction / band / period /
// confidence / rationale). Returns a cold-start (low-confidence) result rather
// than failing when the event store has too few similar labeled cases.

import { NextResponse } from "next/server";
import { predictIssue } from "@/lib/predict/issue";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

interface PredictRequest {
  stockName?: string;
  issueText?: string;
}

export async function POST(req: Request) {
  let body: PredictRequest;
  try {
    body = (await req.json()) as PredictRequest;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const stockName = body.stockName?.trim();
  const issueText = body.issueText?.trim();
  if (!stockName || !issueText) {
    return NextResponse.json(
      { error: "stockName and issueText required" },
      { status: 400 },
    );
  }

  try {
    const prediction = await predictIssue(stockName, issueText);
    return NextResponse.json(prediction);
  } catch (err) {
    console.error("[/api/predict] failure", err);
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
