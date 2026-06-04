"use client";

import { useEffect, useRef, useState } from "react";
import { STOCK_COMP_BOX } from "@/lib/design-tokens";
import { MOBILE_MAX_ISSUES, topByImportance } from "@/lib/issues";
import { useActiveEdit } from "./ActiveEditContext";
import { useActiveStock } from "./ActiveStockContext";
import { useAnalysis, type ViewportMode } from "./AnalysisProvider";
import { ColorBox } from "./ColorBox";
import { IssueGrid } from "./IssueGrid";
import { StockNameMarquee } from "./StockNameMarquee";
import styles from "./StockCard.module.css";

interface Props {
  name: string;
  variant: "current" | "spare";
  /** 0–7 slot position inside the variant's grid. Used so empty-card clicks
   *  can open the edit modal already focused on this slot's dropdown. */
  slotIndex: number;
}

/** Stock-level overall comp box size:
 *    desktop  current=30, spare=19
 *    tablet   current=30, spare=30
 *    mobile   current=30, spare=30  */
function stockCompSize(variant: "current" | "spare", viewport: ViewportMode): number {
  if (viewport === "desktop") {
    return variant === "current" ? STOCK_COMP_BOX.current : STOCK_COMP_BOX.spare;
  }
  return 30; // tablet & mobile both use 30 regardless of variant
}

export function StockCard({ name, variant, slotIndex }: Props) {
  const { stocks, viewport } = useAnalysis();
  const { openStock } = useActiveStock();
  const { openEdit } = useActiveEdit();
  const compSize = stockCompSize(variant, viewport);

  // §14-10 empty slot: card renders at full size with --signal-empty
  // header + 20-grid, blank name, and clicking opens the edit modal.
  const isEmpty = name === "";

  const state = stocks[name] ?? { status: "loading" };
  const ready = !isEmpty && state.status === "ready";
  const overall = ready ? state.stock.overall : null;
  const issues = ready ? state.stock.issues : null;

  // Mobile cards are narrow (150px); long names overflow and get marquee-scrolled.
  // Desktop/tablet cards are 290px and fit the existing names statically.
  const isMobile = viewport === "mobile";

  // #6: fade the name's right edge ONLY when it actually overflows (long
  // searched names) — short names must not be faded. Desktop/tablet only.
  const nameRef = useRef<HTMLSpanElement>(null);
  const [nameFade, setNameFade] = useState(false);
  useEffect(() => {
    const el = nameRef.current;
    if (!el) return;
    const measure = () => setNameFade(el.scrollWidth > el.clientWidth + 1);
    measure();
    // Re-measure once webfonts load — text width can change.
    document.fonts?.ready?.then(measure).catch(() => {});
  }, [name, isMobile]);

  // Mobile shows only the top-10 issues by importance (the card always holds
  // the full fetched set; we trim at render rather than re-analyzing on resize).
  const displayIssues =
    issues && isMobile ? topByImportance(issues, MOBILE_MAX_ISSUES) : issues;

  const handleClick = () => {
    if (isEmpty) openEdit(variant, slotIndex);
    else openStock(name, variant);
  };

  return (
    <div
      className={styles.card}
      // stopPropagation on mousedown so the modal's document-level outside-click
      // listener doesn't fire when switching cards: a different-card click should
      // swap the modal's content, not close-then-reopen.
      onMouseDown={(e) => e.stopPropagation()}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Header: stock name + comprehensive color box, top-aligned and centered horizontally */}
      <div className={styles.header}>
        {isMobile ? (
          <span className={styles.nameSlot}>
            <StockNameMarquee text={name} />
          </span>
        ) : (
          <span
            ref={nameRef}
            className={nameFade ? `${styles.name} ${styles.nameFade}` : styles.name}
          >
            {name}
          </span>
        )}
        <div style={{ width: STOCK_COMP_BOX.gap }} aria-hidden />
        {isEmpty ? (
          <ColorBox signal="empty" size={compSize} />
        ) : overall ? (
          <ColorBox
            signal={overall.signal}
            intensity={overall.intensity}
            size={compSize}
          />
        ) : (
          <ColorBox size={compSize} loading />
        )}
      </div>

      {/* Issue grid — 10×2 on desktop/tablet, 5×2 on mobile. Empty slot
          renders 20 empty boxes (IssueGrid issues=[] path). */}
      <div className={styles.gridWrap}>
        <IssueGrid issues={isEmpty ? [] : displayIssues} />
      </div>
    </div>
  );
}
