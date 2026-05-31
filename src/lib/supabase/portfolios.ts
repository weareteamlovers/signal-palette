import type { SupabaseClient } from "@supabase/supabase-js";

type Variant = "current" | "spare";

/** Fetch both portfolio variants for the logged-in user. Empty entries are
 *  represented as "" so a partially-filled portfolio still has 8 slots. */
export async function fetchOwnPortfolios(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ current: string[]; spare: string[] } | null> {
  const { data, error } = await supabase
    .from("portfolios")
    .select("variant, stocks")
    .eq("user_id", userId);
  if (error) {
    console.warn("[portfolios] fetchOwnPortfolios failed:", error.message);
    return null;
  }
  const out: { current: string[]; spare: string[] } = {
    current: [],
    spare: [],
  };
  for (const row of data ?? []) {
    const v = row.variant as Variant;
    if (v === "current" || v === "spare") {
      out[v] = (row.stocks as string[]) ?? [];
    }
  }
  return out;
}

/** Upsert one variant. Called from updatePortfolio after the edit modal
 *  confirms a change. */
export async function upsertOwnPortfolio(
  supabase: SupabaseClient,
  userId: string,
  variant: Variant,
  stocks: readonly string[],
): Promise<void> {
  const { error } = await supabase
    .from("portfolios")
    .upsert(
      { user_id: userId, variant, stocks: [...stocks] },
      { onConflict: "user_id,variant" },
    );
  if (error) {
    console.warn(
      `[portfolios] upsertOwnPortfolio (${variant}) failed:`,
      error.message,
    );
  }
}
