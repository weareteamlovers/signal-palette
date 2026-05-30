"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { STOCK_MASTER } from "@/data/stock-master";
import styles from "./StockSearchDropdown.module.css";

interface Props {
  /** Names already used in the same portfolio — hidden from candidates per
   *  CLAUDE.md §14-5 ("같은 포트폴리오 내 이미 사용 중인 종목은 후보에서 숨김"). */
  excludeNames: readonly string[];
  /** Row index that triggered the dropdown (0–7). Decides the dropdown's
   *  modal-relative top: row i → top = 7 + 43*i (Figma 1행 예시 frame y=124,
   *  pattern y = 124 + 43*i). x is fixed at left=481 (frame x=882). */
  rowIndex: number;
  /** Called when a [선택] button is clicked. Parent closes the dropdown
   *  and applies the swap (4a-6-3). */
  onSelect: (name: string) => void;
  /** Called when ESC or an outside click closes the dropdown. */
  onClose: () => void;
}

/** Inline magnifying-glass icon — replaces the Figma asset URL (which expires
 *  in 7 days). Same proportions as Lucide's Search at viewBox 24×24. */
function SearchIcon() {
  return (
    <svg
      className={styles.searchIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function StockSearchDropdown({ excludeNames, rowIndex, onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);

  // Client-side includes() filter. Case-insensitive so English tickers /
  // brand names (AMD, ibm, …) match regardless of casing. Korean is already
  // case-insensitive at the codepoint level.
  const candidates = useMemo(() => {
    const used = new Set(excludeNames);
    const q = query.trim().toLowerCase();
    return STOCK_MASTER.filter((name) => {
      if (used.has(name)) return false;
      if (!q) return true;
      return name.toLowerCase().includes(q);
    });
  }, [query, excludeNames]);

  // ESC closes the dropdown (modal stays).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Outside-of-dropdown click closes (clicks inside the modal but outside the
  // dropdown count as outside the dropdown). Edit modal's own outside-click
  // is suppressed by its `modalRef.contains` check since the dropdown lives
  // inside the modal DOM.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const node = ref.current;
      if (node && node.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={styles.dropdown}
      role="listbox"
      style={{ top: 7 + rowIndex * 43 }}
    >
      <div className={styles.search}>
        <SearchIcon />
        <input
          className={styles.input}
          type="text"
          placeholder="종목명을 입력해주세요"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      <ul className={styles.list}>
        {/* Special "비워두기" row — Figma §14-5 (placeholder-state only).
            Lets the user clear a slot. Logo intentionally omitted (Figma
            node 81:493 was removed in the 비워두기 variant). Hidden once
            the user starts typing in the search input. */}
        {query.trim() === "" && (
          <li
            className={styles.row}
            onClick={() => onSelect("")}
            role="option"
            aria-selected="false"
          >
            <span className={styles.rowLogoEmpty} aria-hidden="true" />
            <p className={styles.rowName}>비워두기</p>
            <button
              type="button"
              className={styles.selectBtn}
              onClick={() => onSelect("")}
            >
              선택
            </button>
          </li>
        )}

        {candidates.length === 0 ? (
          <li>
            <p className={styles.empty}>검색 결과가 없어요</p>
          </li>
        ) : (
          candidates.map((name) => (
            <li
              key={name}
              className={styles.row}
              onClick={() => onSelect(name)}
              role="option"
              aria-selected="false"
            >
              <span className={styles.rowLogo} aria-hidden="true" />
              <p className={styles.rowName}>{name}</p>
              <button
                type="button"
                className={styles.selectBtn}
                onClick={() => onSelect(name)}
              >
                선택
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
