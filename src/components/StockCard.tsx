"use client";

import { STOCK_COMP_BOX } from "@/lib/design-tokens";
import { useActiveStock } from "./ActiveStockContext";
import { useAnalysis, type ViewportMode } from "./AnalysisProvider";
import { ColorBox } from "./ColorBox";
import { IssueGrid } from "./IssueGrid";
import { StockNameMarquee } from "./StockNameMarquee";
import styles from "./StockCard.module.css";

interface Props {
  name: string;
  variant: "current" | "spare";
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

export function StockCard({ name, variant }: Props) {
  const { stocks, viewport } = useAnalysis();
  const { openStock } = useActiveStock();
  const state = stocks[name] ?? { status: "loading" };
  const compSize = stockCompSize(variant, viewport);

  const ready = state.status === "ready";
  const overall = ready ? state.stock.overall : null;
  const issues = ready ? state.stock.issues : null;

  // Mobile cards are narrow (150px); long names overflow and get marquee-scrolled.
  // Desktop/tablet cards are 290px and fit the existing names statically.
  const isMobile = viewport === "mobile";

  return (
    <div
      className={styles.card}
      // stopPropagation on mousedown so the modal's document-level outside-click
      // listener doesn't fire when switching cards: a different-card click should
      // swap the modal's content, not close-then-reopen.
      onMouseDown={(e) => e.stopPropagation()}
      onClick={() => openStock(name, variant)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openStock(name, variant);
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
          <span className={styles.name}>{name}</span>
        )}
        <div style={{ width: STOCK_COMP_BOX.gap }} aria-hidden />
        {overall ? (
          <ColorBox
            signal={overall.signal}
            intensity={overall.intensity}
            size={compSize}
          />
        ) : (
          <ColorBox size={compSize} loading />
        )}
      </div>

      {/* Issue grid — 10×2 on desktop/tablet, 5×2 on mobile (driven by IssueGrid). */}
      <div className={styles.gridWrap}>
        <IssueGrid issues={issues} />
      </div>
    </div>
  );
}
