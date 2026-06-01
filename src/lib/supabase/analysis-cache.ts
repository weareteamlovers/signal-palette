// Step 4c-6: read-through cache for stock analysis (shared, non-user data).
// Uses a service-role client so writes bypass RLS (the stock_analysis table
// only grants public SELECT). Server-only — never import from a client
// component. Degrades to a no-op when Supabase env is missing, so /api/analyze
// keeps working (just recomputes every time) until the migration is applied.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { CURRENT_STOCK_NAMES, SPARE_STOCK_NAMES } from "@/data/default-portfolio";
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

/** Step 4c-7: stocks the scheduled refresh should keep warm — every name in
 *  any user's portfolio plus the default 16. Falls back to the defaults alone
 *  when Supabase env is missing or the query fails. */
export async function listInUseStockNames(): Promise<string[]> {
  const set = new Set<string>([...CURRENT_STOCK_NAMES, ...SPARE_STOCK_NAMES]);
  const supabase = serviceClient();
  if (supabase) {
    try {
      const { data } = await supabase.from("portfolios").select("stocks");
      for (const row of (data ?? []) as Array<{ stocks: string[] | null }>) {
        for (const n of row.stocks ?? []) set.add(n);
      }
    } catch {
      // ignore — defaults already seeded
    }
  }
  return [...set].filter((n) => n.trim() !== "");
}

/** Step 4c-7: among `names`, the ones whose cached analysis is older than
 *  `olderThanMs` (or absent entirely), coldest first, capped at `limit`. */
export async function selectStaleStockNames(
  names: string[],
  olderThanMs: number,
  limit: number,
): Promise<string[]> {
  const supabase = serviceClient();
  if (!supabase) return names.slice(0, limit);
  const now = Date.now();
  try {
    const { data } = await supabase
      .from(TABLE)
      .select("stock_name, fetched_at")
      .in("stock_name", names);
    const fetchedAt = new Map<string, number>();
    for (const row of (data ?? []) as Array<{ stock_name: string; fetched_at: string }>) {
      fetchedAt.set(row.stock_name, new Date(row.fetched_at).getTime());
    }
    return names
      .map((n) => ({ n, t: fetchedAt.get(n) ?? 0 })) // missing → 0 = coldest
      .filter((x) => now - x.t >= olderThanMs)
      .sort((a, b) => a.t - b.t)
      .slice(0, limit)
      .map((x) => x.n);
  } catch {
    return names.slice(0, limit);
  }
}
