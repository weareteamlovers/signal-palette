// Step 5 / backfill endpoint (one-time historical bootstrap, US stocks).
// GET /api/backfill?offset=0&limit=3 → processes that slice of the US universe
// and returns `nextOffset` to chain. Heavy (Finnhub + GPT + Yahoo per stock),
// so keep `limit` small (≈3) to stay under maxDuration. Auth: required only if
// CRON_SECRET is set (so it's open for local dev, protected in deployment).

import { NextResponse } from "next/server";
import { backfillStocks } from "@/lib/backfill/run";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected && req.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const params = new URL(req.url).searchParams;
  const offset = Math.max(0, Number(params.get("offset") ?? "0") || 0);
  const limit = Math.min(70, Math.max(1, Number(params.get("limit") ?? "3") || 3));

  try {
    const result = await backfillStocks(offset, limit);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/backfill] failure", err);
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
