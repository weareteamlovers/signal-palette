import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { readSupabaseEnv } from "./env";

/** Per-request server Supabase client. Reads/writes session cookies via
 *  next/headers. Returns null when env is missing. Cannot be cached across
 *  requests — call inside each Server Component / Route Handler. */
export async function createClient() {
  const env = readSupabaseEnv();
  if (!env) return null;
  const cookieStore = await cookies();
  return createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component (read-only cookies). Safe to ignore
          // when middleware is also refreshing the session on every request.
        }
      },
    },
  });
}
