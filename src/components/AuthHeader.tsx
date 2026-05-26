"use client";

import { createClient } from "@/lib/supabase/client";
import styles from "./AuthHeader.module.css";

interface Props {
  /** Set by the server component after `auth.getUser()`. `null` ⇒ logged out.
   *  `nickname` is populated from `user_metadata.nickname` once 4a-5 completes;
   *  until then it's null and we fall back to `email` in the top-right slot. */
  user: { email: string; nickname?: string | null } | null;
}

/** Auth header. Logged-out: §14-2 "로그인 with" label + Google/Kakao buttons.
 *  Logged-in: §14-3 user email (temporary, replaced by nickname in 4a-5) +
 *  logout button. Supabase wiring lives here per 4a-4. */
export function AuthHeader({ user }: Props) {
  async function handleLogin(provider: "google" | "kakao") {
    const supabase = createClient();
    if (!supabase) {
      console.warn("[auth] Supabase not configured — fill in .env.local");
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) console.error("[auth] signIn", provider, error.message);
  }

  async function handleLogout() {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    // Full reload so AnalysisProvider re-runs against the default fixture
    // / portfolio (no per-user portfolio yet — that lands in 4a-7).
    window.location.reload();
  }

  if (user) {
    const topRight = user.nickname ? `${user.nickname}님` : user.email;
    return (
      <div className={styles.root}>
        {user.nickname && (
          <p className={styles.centerName}>{user.nickname}님</p>
        )}
        <p className={styles.userName} title={topRight}>
          {topRight}
        </p>
        <button
          type="button"
          className={styles.logoutBtn}
          onClick={handleLogout}
        >
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <p className={styles.label}>
        <span className={styles.seg1}>로그인</span>
        <span className={styles.space}>{" "}</span>
        <span className={styles.seg2}>with</span>
      </p>
      <button
        type="button"
        className={`${styles.logoBtn} ${styles.google}`}
        aria-label="Google 로 로그인"
        onClick={() => handleLogin("google")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/google.svg" alt="" />
      </button>
      <button
        type="button"
        className={`${styles.logoBtn} ${styles.kakao}`}
        aria-label="카카오로 로그인"
        onClick={() => handleLogin("kakao")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/kakao.svg" alt="" />
      </button>
    </div>
  );
}
