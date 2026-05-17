"use client";

import { CARD, STOCK_COMP_BOX } from "@/lib/design-tokens";
import { useAnalysis } from "./AnalysisProvider";
import { ColorBox } from "./ColorBox";
import { IssueGrid } from "./IssueGrid";
import styles from "./StockCard.module.css";

interface Props {
  name: string;
  variant: "current" | "spare";
}

export function StockCard({ name, variant }: Props) {
  const { stocks } = useAnalysis();
  const state = stocks[name] ?? { status: "loading" };
  const compSize = variant === "current" ? STOCK_COMP_BOX.current : STOCK_COMP_BOX.spare;

  const ready = state.status === "ready";
  const overall = ready ? state.stock.overall : null;
  const issues = ready ? state.stock.issues : null;

  return (
    <div className={styles.card} style={{ width: CARD.width, height: CARD.height }}>
      {/* Header: stock name + comprehensive color box, top-aligned and centered horizontally */}
      <div className={styles.header}>
        <span className={styles.name}>{name}</span>
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

      {/* 20-issue grid */}
      <div className={styles.gridWrap}>
        <IssueGrid issues={issues} />
      </div>
    </div>
  );
}
