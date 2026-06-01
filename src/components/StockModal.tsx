"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Issue } from "@/types";
import { useActiveStock } from "./ActiveStockContext";
import { useAnalysis } from "./AnalysisProvider";
import { ColorBox } from "./ColorBox";
import styles from "./StockModal.module.css";

// Timeline-relative geometry per Figma §14-6:
//   first connector line top = 0 (frame y=179 - modal y=114 - header 65)
//   first row top            = 55 (frame y=234 - 179)
//   step between rows/lines  = 81
const ROW_FIRST_TOP = 55;
const ROW_GAP = 81;
const ROW_HEIGHT = 19; // issue color box height
const TIMELINE_BOTTOM_PAD = 16;

/** Format an ISO 8601 UTC timestamp as "YY.MM.DD 오전/오후 H:MM" in KST.
 *  Called only on the client (after mount) to avoid SSR hydration mismatch. */
function formatKst(iso: string): string {
  const utcMs = new Date(iso).getTime();
  const k = new Date(utcMs + 9 * 60 * 60 * 1000);
  const yy = String(k.getUTCFullYear()).slice(2);
  const mm = String(k.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(k.getUTCDate()).padStart(2, "0");
  const h24 = k.getUTCHours();
  const ampm = h24 < 12 ? "오전" : "오후";
  const h12 = h24 % 12 || 12;
  const min = String(k.getUTCMinutes()).padStart(2, "0");
  return `${yy}.${mm}.${dd} ${ampm} ${h12}:${min}`;
}

export function StockModal() {
  const { activeStockName, activeVariant, closeStock } = useActiveStock();
  const { stocks } = useAnalysis();
  const modalRef = useRef<HTMLDivElement | null>(null);

  // Format timestamps client-side only — Date math on the server would produce
  // a different string (locale/TZ) than the client and trip hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ESC to close
  useEffect(() => {
    if (!activeStockName) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeStock();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeStockName, closeStock]);

  // Outside click — document-level mousedown listener. StockCard stops
  // mousedown propagation, so clicking another card swaps the active stock
  // (via the card's own onClick) without first dismissing the modal.
  useEffect(() => {
    if (!activeStockName) return;
    const onDown = (e: MouseEvent) => {
      const node = modalRef.current;
      if (node && node.contains(e.target as Node)) return;
      closeStock();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [activeStockName, closeStock]);

  const state = activeStockName ? stocks[activeStockName] : undefined;
  const ready = state && state.status === "ready" ? state.stock : null;

  // Modal sorts by createdAt desc (most recent first). The card grid still
  // uses the 7-bucket order separately.
  const visible: Issue[] = useMemo(() => {
    if (!ready) return [];
    return [...ready.issues].sort((a, b) =>
      (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
    );
  }, [ready]);

  if (!activeStockName || !activeVariant) return null;

  const n = visible.length;
  const innerHeight =
    n > 0 ? ROW_FIRST_TOP + (n - 1) * ROW_GAP + ROW_HEIGHT + TIMELINE_BOTTOM_PAD : 0;

  return (
    <div
      ref={modalRef}
      className={styles.modal}
      data-variant={activeVariant}
      role="dialog"
      aria-modal="true"
      aria-label={`${activeStockName} 이슈 파이프라인`}
    >
      <div className={styles.header}>
        <div className={styles.headerCompBox}>
          {ready ? (
            <ColorBox
              signal={ready.overall.signal}
              intensity={ready.overall.intensity}
              size={32}
            />
          ) : (
            <ColorBox size={32} loading />
          )}
        </div>
        <p className={styles.headerLabel}>이슈 파이프라인</p>
        <p className={styles.headerStockName}>{activeStockName}</p>

        <button
          type="button"
          className={styles.chartBtn}
          data-tooltip="Comming Soon!"
          aria-label="차트랑 같이 보기 (준비 중)"
        >
          차트랑 같이 보기
        </button>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={closeStock}
        >
          닫기
        </button>
      </div>

      <div className={styles.timeline}>
        <div
          className={styles.timelineInner}
          style={{ height: innerHeight }}
        >
          {/* N connector lines: 1 above the first box (i=0) + N-1 between
              adjacent pairs (i=1..N-1). Step 81. */}
          {visible.map((_, i) => (
            <span
              key={`line-${i}`}
              className={styles.line}
              style={{ top: i * ROW_GAP }}
            />
          ))}

          {visible.map((issue, i) => (
            <div
              key={`row-${i}-${issue.text}`}
              className={styles.row}
              style={{ top: ROW_FIRST_TOP + i * ROW_GAP }}
            >
              <span className={styles.rowBoxWrap}>
                <ColorBox
                  signal={issue.signal}
                  intensity={issue.intensity}
                  size={19}
                />
              </span>
              <span className={styles.rowContent}>
                <span className={styles.rowText}>{issue.text}</span>
                <span className={styles.rowTime}>
                  {mounted && issue.createdAt ? formatKst(issue.createdAt) : "-"}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
