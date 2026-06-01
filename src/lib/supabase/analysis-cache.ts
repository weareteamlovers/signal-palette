// Step 4c-6: read-through cache for stock analysis (shared, non-user data).
// Uses a service-role client so writes bypass RLS (the stock_analysis table
// only grants public SELECT). Server-only — never import from a client
// component. Degrades to a no-op when Supabase env is missing, so /api/analyze
// keeps working (just recomputes every time) until the migration is applied.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Issue, OverallSignal } from "@/types";

const TABLE = "stock_analysis";

export interface CachedAnalysis {
  issues: Issue[];
  overall: OverallSignal;
}

function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Cached analysis if a row exists and is younger than ttlMs, else null.
 *  Any error (missing table, network) → null so the caller recomputes. */
export async function readCachedAnalysis(
  stockName: string,
  ttlMs: number,
): Promise<CachedAnalysis | null> {
  const supabase = serviceClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("issues, overall, fetched_at")
      .eq("stock_name", stockName)
      .maybeSingle();
    if (error || !data) return null;
    const age = Date.now() - new Date(data.fetched_at as string).getTime();
    if (!Number.isFinite(age) || age > ttlMs) return null;
    return { issues: data.issues as Issue[], overall: data.overall as OverallSignal };
  } catch {
    return null;
  }
}

/** Upsert a fresh analysis. Failures are logged, not thrown — caching is
 *  best-effort and must never break the response. */
export async function writeCachedAnalysis(
  stockName: string,
  issues: Issue[],
  overall: OverallSignal,
): Promise<void> {
  const supabase = serviceClient();
  if (!supabase) return;
  try {
    const { error } = await supabase.from(TABLE).upsert(
      { stock_name: stockName, issues, overall, fetched_at: new Date().toISOString() },
      { onConflict: "stock_name" },
    );
    if (error) console.warn(`[cache] write failed for "${stockName}": ${error.message}`);
  } catch (e) {
    console.warn(`[cache] write threw for "${stockName}"`, e);
  }
}
