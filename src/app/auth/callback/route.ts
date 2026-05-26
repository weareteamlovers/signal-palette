import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Resolve the public origin the browser is actually using. In Codespaces /
 *  any reverse-proxy setup the in-process `request.url` origin can be the
 *  internal URL (e.g. http://localhost:3000) while the browser is on
 *  https://<id>-3000.app.github.dev — redirecting to the internal URL would
 *  hang the browser. Trust the proxy headers when present. */
function publicOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    const proto = forwardedProto ?? "https";
    return `${proto}://${forwardedHost}`;
  }
  return new URL(request.url).origin;
}

/** OAuth callback. Supabase redirects here with `?code=...` after the
 *  provider (Google/Kakao) auth flow completes. We exchange the code for
 *  a session (which sets cookies) and bounce back to `next` (default `/`). */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const origin = publicOrigin(request);

  if (code) {
    try {
      const supabase = await createClient();
      if (supabase) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          return NextResponse.redirect(`${origin}${next}`);
        }
        console.error("[auth/callback] exchange failed:", error.message);
      } else {
        console.warn("[auth/callback] supabase env missing");
      }
    } catch (err) {
      console.error("[auth/callback] unexpected error:", err);
    }
  }

  // Fall through: send the user back to the home page. They'll see the
  // logged-out header and can retry.
  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
