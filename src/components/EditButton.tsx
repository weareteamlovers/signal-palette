"use client";

import { useId, type PointerEvent } from "react";
import { useActiveTooltip } from "./ActiveTooltipContext";
import styles from "./EditButton.module.css";

interface Props {
  onClick?: () => void;
  /** When set, shows a dark hover tooltip with this text (matches ColorBox style).
   *  Used pre-login to surface "로그인 후 바로 이용 가능해요" per §14-2. */
  tooltip?: string;
}

/** Portfolio "수정" button. Identical visual style in both portfolios
 *  (current and spare) — no variant prop. */
export function EditButton({ onClick, tooltip }: Props) {
  const { activeKey, toggle } = useActiveTooltip();
  const tooltipKey = useId();
  const tooltipOpen = !!tooltip && activeKey === tooltipKey;

  // Touch tap → show the pre-login tooltip for 3s (same toggle semantics as
  // ColorBox: re-tap closes, tapping another tooltip target switches). Mouse
  // keeps the CSS-only :hover behavior; canEdit buttons (no tooltip) no-op.
  const handlePointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (!tooltip) return;
    if (e.pointerType !== "touch") return;
    toggle(tooltipKey);
  };

  return (
    <button
      type="button"
      className={tooltipOpen ? `${styles.btn} ${styles.tooltipOpen}` : styles.btn}
      // Stop mousedown so EditPortfolioModal's document outside-click listener
      // doesn't fire — clicking the other variant's button transitions the
      // modal's content instead of closing it.
      onMouseDown={(e) => e.stopPropagation()}
      onClick={onClick}
      onPointerUp={handlePointerUp}
      data-tooltip={tooltip}
    >
      수정
    </button>
  );
}
