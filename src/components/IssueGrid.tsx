import { ISSUE_GRID } from "@/lib/design-tokens";
import type { Issue } from "@/types";
import { ColorBox } from "./ColorBox";
import styles from "./IssueGrid.module.css";

interface Props {
  /** null while the stock's analysis is in flight — renders all 20 boxes
   *  as shimmering placeholders. */
  issues: Issue[] | null;
}

const TOTAL = ISSUE_GRID.cols * ISSUE_GRID.rows; // 20

export function IssueGrid({ issues }: Props) {
  const isLoading = issues == null;
  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(${ISSUE_GRID.cols}, ${ISSUE_GRID.size}px)`,
    gridTemplateRows: `repeat(${ISSUE_GRID.rows}, ${ISSUE_GRID.size}px)`,
    gap: ISSUE_GRID.gap,
  };

  if (isLoading) {
    return (
      <div className={styles.grid} style={gridStyle}>
        {Array.from({ length: TOTAL }).map((_, i) => (
          <ColorBox key={i} size={ISSUE_GRID.size} rounded loading />
        ))}
      </div>
    );
  }

  // Render in GPT order — sort logic intentionally removed in Step 3.
  return (
    <div className={styles.grid} style={gridStyle}>
      {Array.from({ length: TOTAL }).map((_, i) => {
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
