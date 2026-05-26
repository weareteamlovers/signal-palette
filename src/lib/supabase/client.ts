"use client";

import { createBrowserClient } from "@supabase/ssr";
import { readSupabaseEnv } from "./env";

/** Browser-side Supabase client. Returns null when env is missing so the UI
 *  can stay in logged-out mode until .env.local is filled in. Callers should
 *  guard: `const supabase = createClient(); if (!supabase) return;`. */
export function createClient() {
  const env = readSupabaseEnv();
  if (!env) return null;
  return createBrowserClient(env.url, env.key);
}
