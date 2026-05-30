import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** POST /api/check-nickname
 *  body: { nickname: string }
 *  returns: { available: boolean }
 *
 *  Checks across every Supabase user's user_metadata.nickname for a match.
 *  Used by NicknameModal (4a-5) to prevent two accounts (e.g. Kakao + Google)
 *  from claiming the same nickname. Real `profiles` table with a UNIQUE
 *  constraint lands in 4a-7 and will replace this scan. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ available: false, error: "bad-json" }, { status: 400 });
  }
  const nickname =
    typeof (body as { nickname?: unknown })?.nickname === "string"
      ? ((body as { nickname: string }).nickname).trim()
      : "";
  if (!nickname) {
    return NextResponse.json({ available: false, error: "empty" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    // Env missing — degrade gracefully so dev without secrets still works.
    return NextResponse.json({ available: true, warning: "admin-disabled" });
  }

  // Walk every user. perPage caps at 1000 in GoTrue; for this stage the user
  // count stays small, so a single page is fine. If it grows we'll move to
  // the profiles table in 4a-7 anyway.
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) {
    console.warn("[check-nickname] listUsers failed:", error.message);
    return NextResponse.json({ available: true, warning: "list-failed" });
  }

  const taken = data.users.some((u) => {
    const n = (u.user_metadata as Record<string, unknown> | null)?.nickname;
    return typeof n === "string" && n === nickname;
  });

  return NextResponse.json({ available: !taken });
}
