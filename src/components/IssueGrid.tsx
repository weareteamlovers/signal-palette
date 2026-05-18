"use client";

import { ISSUE_GRID } from "@/lib/design-tokens";
import type { Issue } from "@/types";
import { useAnalysis } from "./AnalysisProvider";
import { ColorBox } from "./ColorBox";
import styles from "./IssueGrid.module.css";

interface Props {
  /** null while the stock's analysis is in flight — renders the full grid
   *  as shimmering placeholders. */
  issues: Issue[] | null;
}

/** Per-viewport grid shape. Mobile shrinks to 5×2 = 10 boxes, matching the
 *  maxIssues=10 that AnalysisProvider already requests on mobile. */
const GRID_BY_VIEWPORT = {
  desktop: { cols: ISSUE_GRID.cols, rows: ISSUE_GRID.rows }, // 10 × 2
  tablet: { cols: ISSUE_GRID.cols, rows: ISSUE_GRID.rows }, //  10 × 2
  mobile: { cols: 5, rows: 2 }, //                              5 × 2
} as const;

export function IssueGrid({ issues }: Props) {
  const { viewport } = useAnalysis();
  const { cols, rows } = GRID_BY_VIEWPORT[viewport];
  const total = cols * rows;
  const isLoading = issues == null;

  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(${cols}, ${ISSUE_GRID.size}px)`,
    gridTemplateRows: `repeat(${rows}, ${ISSUE_GRID.size}px)`,
    gap: ISSUE_GRID.gap,
  };

  if (isLoading) {
    return (
      <div className={styles.grid} style={gridStyle}>
        {Array.from({ length: total }).map((_, i) => (
          <ColorBox key={i} size={ISSUE_GRID.size} rounded loading />
        ))}
      </div>
    );
  }

  // Render in GPT order — sort logic intentionally removed in Step 3.
  return (
    <div className={styles.grid} style={gridStyle}>
      {Array.from({ length: total }).map((_, i) => {
        const issue = issues[i];
        if (!issue) {
          return <ColorBox key={i} signal="empty" size={ISSUE_GRID.size} rounded />;
        }
        return (
          <ColorBox
            key={i}
            signal={issue.signal}
            intensity={issue.intensity}
            size={ISSUE_GRID.size}
            rounded
            title={issue.text}
            issue={issue}
            staggerIndex={i}
          />
        );
      })}
    </div>
  );
}
