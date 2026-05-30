import { createClient } from "@supabase/supabase-js";

/** Service-role Supabase client. SERVER ONLY — never import from a "use
 *  client" component, the key bypasses RLS and must not reach the browser.
 *  Returns null when env is missing so the caller can fall back gracefully. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
