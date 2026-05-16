import { ISSUE_GRID } from "@/lib/design-tokens";
import type { Issue, Signal } from "@/types";
import { ColorBox } from "./ColorBox";
import styles from "./IssueGrid.module.css";

interface Props {
  issues: Issue[];
}

const SIGNAL_ORDER: Signal[] = ["positive", "neutral", "negative"];

export function IssueGrid({ issues }: Props) {
  // Sort by signal order: green → yellow → red, then pad with empty up to 20.
  const sorted = [...issues].sort(
    (a, b) => SIGNAL_ORDER.indexOf(a.signal) - SIGNAL_ORDER.indexOf(b.signal),
  );
  const total = ISSUE_GRID.cols * ISSUE_GRID.rows; // 20

  return (
    <div
      className={styles.grid}
      style={{
        gridTemplateColumns: `repeat(${ISSUE_GRID.cols}, ${ISSUE_GRID.size}px)`,
        gridTemplateRows: `repeat(${ISSUE_GRID.rows}, ${ISSUE_GRID.size}px)`,
        gap: ISSUE_GRID.gap,
      }}
    >
      {Array.from({ length: total }).map((_, i) => {
        const issue = sorted[i];
        if (!issue) {
          return <ColorBox key={i} signal="empty" size={ISSUE_GRID.size} rounded />;
        }
        return (
          <ColorBox
            key={i}
            signal={issue.signal}
            size={ISSUE_GRID.size}
            rounded
            title={issue.text}
            issue={issue}
          />
        );
      })}
    </div>
  );
}
