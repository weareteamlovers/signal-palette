// Step 5 / Phase 1: service-role access to the event store (event_log +
// event_outcome). Mirrors analysis-cache.ts — writes bypass RLS via
// SUPABASE_SECRET_KEY; every function no-ops without env so the app degrades
// cleanly (capture/labeling just don't happen until the migration is applied).
// Server-only — never import from a client component.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** A row to log on an issue's first appearance. `embedding` is the pgvector
 *  text form ("[0.1,0.2,…]"); `t0` is ISO 8601. `id` is optional — the forward
 *  capture lets the DB default it, but the backfill sets it explicitly so the
 *  matching event_outcome can reference it without a round-trip. */
export interface EventRow {
  id?: string;
  stock_name: string;
  market?: string;
  symbol?: string;
  sector?: string;
  industry?: string;
  benchmark?: string;
  issue_text: string;
  signal?: string;
  intensity?: string;
  source_url?: string;
  t0: string;
  embedding: string;
  dedup_key: string;
}

/** Of `keys`, the dedup_keys already present in the log. */
export async function existingDedupKeys(keys: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  const supabase = serviceClient();
  if (!supabase || keys.length === 0) return out;
  try {
    const { data } = await supabase
      .from("event_log")
      .select("dedup_key")
      .in("dedup_key", keys);
    for (const r of (data ?? []) as Array<{ dedup_key: string }>) out.add(r.dedup_key);
  } catch {
    // ignore — caller treats everything as new (insert dedupes on conflict)
  }
  return out;
}

/** Insert new event rows; duplicate dedup_keys are ignored. Best-effort. */
export async function insertEvents(rows: EventRow[]): Promise<void> {
  const supabase = serviceClient();
  if (!supabase || rows.length === 0) return;
  try {
    const { error } = await supabase
      .from("event_log")
      .upsert(rows, { onConflict: "dedup_key", ignoreDuplicates: true });
    if (error) console.warn(`[events] insert failed: ${error.message}`);
  } catch (e) {
    console.warn("[events] insert threw", e);
  }
}

export interface DueEvent {
  id: string;
  stock_name: string;
  symbol: string;
  benchmark: string;
  t0: string;
}

/** Unlabeled events older than minAgeMs (and labelable), oldest first. */
export async function selectDueEvents(
  minAgeMs: number,
  limit: number,
): Promise<DueEvent[]> {
  const supabase = serviceClient();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.rpc("due_events", {
      min_age_seconds: Math.floor(minAgeMs / 1000),
      lim: limit,
    });
    if (error || !data) return [];
    return data as DueEvent[];
  } catch {
    return [];
  }
}

export interface OutcomeRow {
  event_id: string;
  benchmark: string;
  ret_1d: number | null;
  ret_3d: number | null;
  ret_5d: number | null;
  abret_1d: number | null;
  abret_3d: number | null;
  abret_5d: number | null;
}

/** Insert outcome rows for newly labeled events. Best-effort. */
export async function insertOutcomes(rows: OutcomeRow[]): Promise<void> {
  const supabase = serviceClient();
  if (!supabase || rows.length === 0) return;
  try {
    const { error } = await supabase
      .from("event_outcome")
      .upsert(rows, { onConflict: "event_id", ignoreDuplicates: true });
    if (error) console.warn(`[events] outcome insert failed: ${error.message}`);
  } catch (e) {
    console.warn("[events] outcome insert threw", e);
  }
}

/** A labeled neighbor returned by the match_events RPC (Phase 2 retrieval):
 *  a past event similar to the query, with its realized excess returns. */
export interface NeighborEvent {
  id: string;
  stock_name: string;
  sector: string | null;
  issue_text: string;
  t0: string;
  similarity: number; // cosine, 1 = identical
  abret_1d: number | null;
  abret_3d: number | null;
  abret_5d: number | null;
}

/** k nearest labeled events to `embedding`, optionally scoped to one stock or
 *  sector. Empty (graceful) without env or before the migration. */
export async function matchEvents(
  embedding: number[],
  opts: { stock?: string; sector?: string; limit: number },
): Promise<NeighborEvent[]> {
  const supabase = serviceClient();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.rpc("match_events", {
      query_embedding: JSON.stringify(embedding),
      filter_stock: opts.stock ?? null,
      filter_sector: opts.sector ?? null,
      match_count: opts.limit,
    });
    if (error || !data) return [];
    return data as NeighborEvent[];
  } catch {
    return [];
  }
}
