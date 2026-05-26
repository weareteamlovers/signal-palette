/** Read Supabase env once. Returns null if either var is missing so the rest
 *  of the app can degrade gracefully (logged-out state) until .env.local is
 *  filled in. The keepalive workflow expects these same two names. */
export function readSupabaseEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}
