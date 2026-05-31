import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** POST /api/check-nickname
 *  body: { nickname: string }
 *  returns: { available: boolean }
 *
 *  4a-7: backed by the `public.check_nickname(text)` Postgres function
 *  (SECURITY DEFINER) so the row scan happens with elevated privileges while
 *  the public RLS policy still restricts plain SELECT on profiles to the
 *  row owner. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ available: false, error: "bad-json" }, { status: 400 });
  }
  const nickname =
    typeof (body as { nickname?: unknown })?.nickname === "string"
      ? (body as { nickname: string }).nickname.trim()
      : "";
  if (!nickname) {
    return NextResponse.json({ available: false, error: "empty" }, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) {
    // Env missing — degrade gracefully (dev without secrets still walkable).
    return NextResponse.json({ available: true, warning: "no-supabase" });
  }

  const { data, error } = await supabase.rpc("check_nickname", { name: nickname });
  if (error) {
    console.warn("[check-nickname] rpc failed:", error.message);
    return NextResponse.json({ available: true, warning: "rpc-failed" });
  }
  return NextResponse.json({ available: data === true });
}
