import { CENTRAL } from "@/lib/design-tokens";
import type { Issue } from "@/types";
import { ColorBox } from "./ColorBox";
import styles from "./CentralIssue.module.css";

interface Props {
  stockName: string;
  issue: Issue;
}

/**
 * Central ticker showing one issue at a time. Step 1 = static.
 * Step 2 will add the 3-second slide animation.
 *
 * Layout from Figma:
 *   [stockName] [signal box 24×24] "[issue text]"
 * Text font 24px Roboto SemiBold, top of text at y=584, top of box at y=586.
 */
export function CentralIssue({ stockName, issue }: Props) {
  return (
    <div className={styles.row}>
      <span className={styles.text}>{stockName}</span>
      <span className={styles.boxSlot}>
        <ColorBox signal={issue.signal} size={CENTRAL.signalBoxSize} />
      </span>
      <span className={styles.text}>&ldquo;{issue.text}&rdquo;</span>
    </div>
  );
}
