"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { upsertOwnProfile } from "@/lib/supabase/profiles";
import styles from "./NicknameModal.module.css";

interface Props {
  /** Fired once after a successful save + 2s success-message display. */
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

export function NicknameModal({ onComplete }: Props) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // After an error, click on [확인] leaves focus on the button, so Ctrl/Cmd+A
  // would select the whole page. Re-focus the input so the shortcut behaves
  // like a normal text field (select input contents only).
  useEffect(() => {
    if (status.kind === "error") {
      inputRef.current?.focus();
    }
  }, [status]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (status.kind === "error") setStatus({ kind: "idle" });
    setValue(e.target.value);
  };

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setStatus({ kind: "error", msg: "아무것도 입력되지 않았어요!" });
      return;
    }
    const localErr = validate(trimmed);
    if (localErr) {
      setStatus({ kind: "error", msg: localErr });
      return;
    }

    setSubmitting(true);
    setStatus({ kind: "idle" });

    // Real duplicate check against every Supabase user's user_metadata.nickname
    // (admin-only endpoint). 4a-7 replaces this with a profiles table + UNIQUE
    // constraint and lets us include the user's own id in the exclude list.
    try {
      const dupRes = await fetch("/api/check-nickname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: trimmed }),
      });
      const dup = (await dupRes.json()) as { available?: boolean };
      if (!dup.available) {
        setStatus({ kind: "error", msg: "이미 사용중인 닉네임이에요 ㅠ.ㅠ" });
        setSubmitting(false);
        return;
      }
    } catch (err) {
      console.warn("[nickname] dup check failed, proceeding optimistically", err);
    }

    const supabase = createClient();
    if (!supabase) {
      console.warn("[nickname] supabase env missing; skipping save");
    } else {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        setStatus({ kind: "error", msg: "로그인 정보를 확인할 수 없어요" });
        setSubmitting(false);
        return;
      }
      const res = await upsertOwnProfile(supabase, userId, trimmed);
      if (!res.ok) {
        if (res.reason === "duplicate") {
          setStatus({ kind: "error", msg: "이미 사용중인 닉네임이에요 ㅠ.ㅠ" });
        } else {
          setStatus({ kind: "error", msg: "저장에 실패했어요. 다시 시도해주세요" });
        }
        setSubmitting(false);
        return;
      }
    }

    setStatus({ kind: "success", msg: "닉네임 설정이 완료됐어요" });
    window.setTimeout(() => onComplete(trimmed), SUCCESS_HOLD_MS);
  }, [value, onComplete]);

  // Enter shortcut. ESC is intentionally ignored per §14-9 (non-dismissible).
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
      <p className={styles.title}>사용할 닉네임을 입력해 주세요</p>

      <div className={styles.inputWrap}>
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          placeholder="닉네임"
          value={value}
          onChange={handleChange}
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
