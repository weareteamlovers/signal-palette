import type { SupabaseClient } from "@supabase/supabase-js";

/** Single-source-of-truth for a logged-in user's nickname. RLS guarantees a
 *  user can only read their own row, so this never returns someone else's. */
export async function fetchOwnProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ nickname: string } | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.warn("[profiles] fetchOwnProfile failed:", error.message);
    return null;
  }
  return data ?? null;
}

/** Upsert the current user's profile row. Used by NicknameModal after the
 *  user confirms a (validated, unique) nickname. */
export async function upsertOwnProfile(
  supabase: SupabaseClient,
  userId: string,
  nickname: string,
): Promise<{ ok: true } | { ok: false; reason: "duplicate" | "other" }> {
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, nickname }, { onConflict: "id" });
  if (error) {
    if (error.code === "23505") return { ok: false, reason: "duplicate" };
    console.warn("[profiles] upsertOwnProfile failed:", error.message);
    return { ok: false, reason: "other" };
  }
  return { ok: true };
}
