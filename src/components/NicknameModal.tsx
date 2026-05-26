"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./NicknameModal.module.css";

interface Props {
  /** Initial nickname (rare — only if a previous save partially succeeded). */
  initial?: string;
  /** Fired once after a successful save + 2s success-message display. The
   *  parent removes the modal in response. 4a-6 will additionally open the
   *  edit-portfolio modal here. */
  onComplete: (nickname: string) => void;
}

type Status =
  | { kind: "idle" }
  | { kind: "error"; msg: string }
  | { kind: "success"; msg: string };

const NICKNAME_RE = /^[\p{L}\p{N}_]+$/u;
const SUCCESS_HOLD_MS = 2000;

/** Validate per §14-8: 2–16 chars, Korean+Latin letters+digits+underscore,
 *  no spaces / special chars. */
function validate(nickname: string): string | null {
  if (nickname.length < 2 || nickname.length > 16) {
    return "닉네임은 2~16자여야 해요";
  }
  if (!NICKNAME_RE.test(nickname)) {
    return "한글/영문/숫자/_만 사용할 수 있어요";
  }
  return null;
}

export function NicknameModal({ initial = "", onComplete }: Props) {
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim();
    const localErr = validate(trimmed);
    if (localErr) {
      setStatus({ kind: "error", msg: localErr });
      return;
    }

    setSubmitting(true);
    setStatus({ kind: "idle" });

    // Mock duplicate check (always passes per CLAUDE.md 4a-5). Real DB
    // uniqueness check arrives in 4a-7 via the `profiles` table.
    // 의도된 에러 메시지 색은 #e9eabc — "이미 사용중인 닉네임이에요 ㅠ.ㅠ".

    const supabase = createClient();
    if (!supabase) {
      // Env missing — surface as success so the dev UI is still walkable.
      console.warn("[nickname] supabase env missing; skipping save");
    } else {
      const { error } = await supabase.auth.updateUser({
        data: { nickname: trimmed },
      });
      if (error) {
        console.error("[nickname] updateUser failed:", error.message);
        setStatus({ kind: "error", msg: "저장에 실패했어요. 다시 시도해주세요" });
        setSubmitting(false);
        return;
      }
    }

    setStatus({ kind: "success", msg: "닉네임 설정이 완료됐어요" });

    // Hold the success message for 2s, then hand off to the parent.
    window.setTimeout(() => onComplete(trimmed), SUCCESS_HOLD_MS);
  }, [value, onComplete]);

  // ESC must be ignored per §14-9 (this modal is non-dismissible). We don't
  // attach an ESC listener at all — but if a sibling modal added one, this
  // also covers Enter as a confirm shortcut.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter" && !submitting && status.kind !== "success") {
        e.preventDefault();
        handleSubmit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSubmit, submitting, status.kind]);

  const statusClass =
    status.kind === "error"
      ? `${styles.status} ${styles.statusError}`
      : status.kind === "success"
        ? `${styles.status} ${styles.statusSuccess}`
        : styles.status;

  return (
    <div
      className={styles.modal}
      role="dialog"
      aria-modal="true"
      aria-label="닉네임 설정"
    >
      <p className={styles.subtitle}>시그널 팔레트 가입이 완료됐어요</p>
      <p className={styles.title}>사용할 닉네임을 입력해주세요</p>

      <div className={styles.inputWrap}>
        <input
          className={styles.input}
          type="text"
          placeholder="닉네임"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (status.kind === "error") setStatus({ kind: "idle" });
          }}
          maxLength={16}
          disabled={submitting || status.kind === "success"}
          autoFocus
        />
        <button
          type="button"
          className={styles.confirmBtn}
          onClick={handleSubmit}
          disabled={submitting || status.kind === "success"}
        >
          확인
        </button>
      </div>

      {status.kind !== "idle" && (
        <p className={statusClass}>{status.msg}</p>
      )}
    </div>
  );
}
