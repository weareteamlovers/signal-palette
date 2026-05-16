"use client";

import { useEffect, useMemo, useState } from "react";
import { CENTRAL } from "@/lib/design-tokens";
import type { Portfolio } from "@/types";
import { ColorBox } from "./ColorBox";
import { useActiveIssue } from "./ActiveIssueContext";
import styles from "./CentralIssue.module.css";

interface Props {
  portfolios: Portfolio[];
}

const INTERVAL_MS = 3000;

/**
 * Central ticker that cycles through every issue across all portfolios in
 * stock order (current portfolio first, then spare). Each issue stays for
 * INTERVAL_MS, transitioning with a top→down fade slide. Hovering the row
 * pauses auto-advance and zooms the row 5% so the user can tell it's paused.
 *
 * The currently-displayed issue is published through ActiveIssueContext so
 * the matching color box in IssueGrid can render its highlight stroke.
 */
export function CentralIssue({ portfolios }: Props) {
  const flat = useMemo(
    () =>
      portfolios.flatMap((p) =>
        p.stocks.flatMap((s) =>
          s.issues.map((issue) => ({ stockName: s.name, issue })),
        ),
      ),
    [portfolios],
  );

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const { setActiveIssue } = useActiveIssue();

  // Publish current issue to context whenever it changes.
  useEffect(() => {
    if (flat.length === 0) {
      setActiveIssue(null);
      return;
    }
    setActiveIssue(flat[index].issue);
  }, [flat, index, setActiveIssue]);

  // Auto-advance every INTERVAL_MS unless hovered.
  useEffect(() => {
    if (paused || flat.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % flat.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [paused, flat.length]);

  if (flat.length === 0) return null;
  const { stockName, issue } = flat[index];

  return (
    <div
      className={styles.row}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* key={index} remounts the inner content, replaying fadeSlideIn for every transition */}
      <div key={index} className={styles.slide}>
        <span className={styles.text}>{stockName}</span>
        <span className={styles.boxSlot}>
          <ColorBox signal={issue.signal} size={CENTRAL.signalBoxSize} />
        </span>
        <span className={styles.text}>&ldquo;{issue.text}&rdquo;</span>
      </div>
    </div>
  );
}
