"use client";

import styles from "./AuthHeader.module.css";

/** Logged-out OAuth entry point — "로그인 with" label + Google/Kakao logos.
 *  Positions/sizes verified against Figma nodes 76:117 / 76:118 / 76:119;
 *  see docs/design/design-tokens.md §14-2.
 *
 *  4a-2: click handlers are stubs (console.log). Real Supabase signInWithOAuth
 *  wiring lands in 4a-4. */
export function AuthHeader() {
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
        onClick={() => console.log("TODO: oauth google")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/google.svg" alt="" />
      </button>
      <button
        type="button"
        className={`${styles.logoBtn} ${styles.kakao}`}
        aria-label="카카오로 로그인"
        onClick={() => console.log("TODO: oauth kakao")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/kakao.svg" alt="" />
      </button>
    </div>
  );
}
