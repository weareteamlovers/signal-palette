"use client";

import { useEffect, useRef, useState } from "react";
import { useActiveEdit } from "./ActiveEditContext";
import { StockSearchDropdown } from "./StockSearchDropdown";
import styles from "./EditPortfolioModal.module.css";

// Modal-relative row geometry per Figma §14-4. text/btn/handle share a row
// that increments by 43px. Handle has three 1px lines stacked at y +0/+5/+10.
const ROW_TEXT_TOP_BASE = 20;   // 137 - 117
const ROW_BTN_TOP_BASE = 14;    // 131 - 117
const ROW_HANDLE_TOP_BASE = 23; // 140 - 117
const ROW_GAP = 43;
const SEPARATOR_TOPS = [49, 92, 135, 178, 221, 264, 307]; // 7 lines

interface Props {
  /** Stock names for both portfolios — the active variant decides which one
   *  renders. Always 8 entries (4a-7 may shrink dynamically; for now we pad). */
  currentNames: readonly string[];
  spareNames: readonly string[];
}

function padTo8(arr: readonly string[]): string[] {
  const out = [...arr];
  while (out.length < 8) out.push("");
  return out.slice(0, 8);
}

export function EditPortfolioModal({ currentNames, spareNames }: Props) {
  const { activeVariant, closeEdit } = useActiveEdit();
  const modalRef = useRef<HTMLDivElement | null>(null);
  // Which row's [변경] dropdown is open. null when no dropdown is shown.
  // 4a-6-2 only logs the selected name; 4a-6-3 will mutate the slot.
  const [openRow, setOpenRow] = useState<number | null>(null);

  // Close any open dropdown when the modal closes / variant swaps.
  useEffect(() => {
    if (!activeVariant) setOpenRow(null);
  }, [activeVariant]);

  // ESC closes (treated as 취소 per §14-4)
  useEffect(() => {
    if (!activeVariant) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeEdit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeVariant, closeEdit]);

  // Outside click closes. EditButton stops mousedown propagation so clicking
  // the OTHER variant's button transitions the modal instead of closing it.
  useEffect(() => {
    if (!activeVariant) return;
    const onDown = (e: MouseEvent) => {
      const node = modalRef.current;
      if (node && node.contains(e.target as Node)) return;
      closeEdit();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [activeVariant, closeEdit]);

  if (!activeVariant) return null;

  const names = padTo8(
    activeVariant === "current" ? currentNames : spareNames,
  );

  return (
    <div
      ref={modalRef}
      className={styles.modal}
      data-variant={activeVariant}
      role="dialog"
      aria-modal="true"
      aria-label={`${activeVariant === "current" ? "현재" : "예비"} 포트폴리오 수정`}
    >
      {SEPARATOR_TOPS.map((top) => (
        <span key={`sep-${top}`} className={styles.separator} style={{ top }} />
      ))}

      {names.map((name, i) => {
        const textTop = ROW_TEXT_TOP_BASE + i * ROW_GAP;
        const btnTop = ROW_BTN_TOP_BASE + i * ROW_GAP;
        const handleTop = ROW_HANDLE_TOP_BASE + i * ROW_GAP;
        return (
          <div key={`row-${i}`}>
            <p className={styles.number} style={{ top: textTop }}>
              {i + 1}
            </p>
            <p className={styles.stockName} style={{ top: textTop }}>
              {name}
            </p>
            <button
              type="button"
              className={styles.changeBtn}
              style={{ top: btnTop }}
              // Stop mousedown so an already-open dropdown's document listener
              // doesn't fire close-then-reopen when switching rows.
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setOpenRow(i)}
            >
              변경
            </button>
            <div
              className={styles.handle}
              style={{ top: handleTop }}
              aria-label="드래그하여 순서 변경"
              // 4a-6-4 wires dnd-kit listeners here.
            >
              <span className={styles.handleLine} style={{ top: 0 }} />
              <span className={styles.handleLine} style={{ top: 5 }} />
              <span className={styles.handleLine} style={{ top: 10 }} />
            </div>
          </div>
        );
      })}

      <button
        type="button"
        className={styles.cancelBtn}
        onClick={closeEdit}
      >
        취소
      </button>
      <button
        type="button"
        className={styles.confirmBtn}
        onClick={closeEdit}
        // 4a-6-3 swaps this for the save + analyze re-fetch path.
      >
        완료
      </button>

      {openRow !== null && (
        <StockSearchDropdown
          excludeNames={names.filter((n) => n !== "")}
          // spare variant: rows 4–8 (index ≥ 3) would push the dropdown past
          // the footer (frame bottom y > 1145), so we clamp the *display*
          // position to row 3 (index 2). The actual slot being edited is
          // still `openRow`. Per user (2026-05-26). current variant has
          // plenty of room below, so it's unaffected.
          rowIndex={
            activeVariant === "spare" && openRow >= 3 ? 2 : openRow
          }
          onSelect={(name) => {
            // 4a-6-3 will mutate the slot here. For now just log so the
            // wiring is visible during manual verification.
            console.log("[edit] select", { row: openRow, name });
            setOpenRow(null);
          }}
          onClose={() => setOpenRow(null)}
        />
      )}
    </div>
  );
}
