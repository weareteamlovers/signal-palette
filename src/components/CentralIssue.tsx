"use client";

import { useEffect, useMemo, useState } from "react";
import { CENTRAL } from "@/lib/design-tokens";
import { CURRENT_STOCK_NAMES, SPARE_STOCK_NAMES } from "@/data/default-portfolio";
import type { Issue } from "@/types";
import { ColorBox } from "./ColorBox";
import { useActiveIssue } from "./ActiveIssueContext";
import { useAnalysis } from "./AnalysisProvider";
import styles from "./CentralIssue.module.css";

const INTERVAL_MS = 3000;

/**
 * Central ticker. Cycles through every ready issue across both portfolios in
 * stock order (current first, then spare). Each issue stays for INTERVAL_MS
 * with a top→down fade slide. Hovering the row pauses auto-advance and
 * lifts the row 5% so the paused state is visible. Publishes the active
 * issue to ActiveIssueContext so IssueGrid can stroke the matching box.
 *
 * While analysis is in flight (no stocks ready yet) we render a static
 * "분석 중…" placeholder.
 */
export function CentralIssue() {
  const { stocks } = useAnalysis();

  const flat = useMemo(() => {
    const out: Array<{ stockName: string; issue: Issue }> = [];
    const push = (names: readonly string[]) => {
      for (const name of names) {
        const s = stocks[name];
        if (!s || s.status !== "ready") continue;
        for (const issue of s.stock.issues) {
          out.push({ stockName: name, issue });
        }
      }
    };
    push(CURRENT_STOCK_NAMES);
    push(SPARE_STOCK_NAMES);
    return out;
  }, [stocks]);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const { setActiveIssue } = useActiveIssue();

  // Clamp index when flat shrinks (e.g. mock fallback returns fewer issues).
  useEffect(() => {
    if (flat.length === 0) {
      if (index !== 0) setIndex(0);
      return;
    }
    if (index >= flat.length) setIndex(index % flat.length);
  }, [flat.length, index]);

  // Publish current issue to context whenever it changes.
  useEffect(() => {
    if (flat.length === 0) {
      setActiveIssue(null);
      return;
    }
    setActiveIssue(flat[index % flat.length].issue);
  }, [flat, index, setActiveIssue]);

  // Auto-advance every INTERVAL_MS unless hovered.
  useEffect(() => {
    if (paused || flat.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % flat.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [paused, flat.length]);

  if (flat.length === 0) {
    return (
      <div className={styles.row}>
        <span className={styles.text}>분석 중…</span>
      </div>
    );
  }

  const { stockName, issue } = flat[index % flat.length];

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
          <ColorBox signal={issue.signal} intensity={issue.intensity} size={CENTRAL.signalBoxSize} />
        </span>
        <span className={styles.text}>&ldquo;{issue.text}&rdquo;</span>
      </div>
    </div>
  );
}
