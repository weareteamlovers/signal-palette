"use client";

import { useEffect, useMemo, useState } from "react";
import { CURRENT_STOCK_NAMES, SPARE_STOCK_NAMES } from "@/data/default-portfolio";
import { MOBILE_MAX_ISSUES, topByPop } from "@/lib/issues";
import type { Issue } from "@/types";
import { AnalyzingText } from "./AnalyzingText";
import { ArticleLink } from "./ArticleLink";
import { useActiveIssue } from "./ActiveIssueContext";
import { useAnalysis } from "./AnalysisProvider";
import { ColorBox } from "./ColorBox";
import styles from "./TopTicker.module.css";

const INTERVAL_MS = 3000;
const SIGNAL_BOX_SIZE = 12;

/**
 * Sticky top ticker used on tablet and mobile viewports — replaces the
 * center-of-page CentralIssue from desktop. Cycles ready issues from both
 * portfolios in stock order, publishes the active issue to ActiveIssueContext
 * so any visible IssueGrid box still shows the white stroke trace.
 *
 * Rendered only when viewport ≠ desktop. The component mounts on every page
 * (so the analysis pipeline is in scope), but returns null on desktop so the
 * setInterval / setActiveIssue cycle never starts there.
 */
export function TopTicker() {
  const { stocks, viewport } = useAnalysis();
  const visible = viewport !== "desktop";

  const flat = useMemo(() => {
    // Mobile cycles only the top-10 issues by importance (same trim as the
    // mobile card grid); tablet keeps the full set.
    const limit =
      viewport === "mobile" ? MOBILE_MAX_ISSUES : Number.POSITIVE_INFINITY;
    const out: Array<{ stockName: string; issue: Issue }> = [];
    const push = (names: readonly string[]) => {
      for (const name of names) {
        const s = stocks[name];
        if (!s || s.status !== "ready") continue;
        for (const issue of topByPop(s.stock.issues, limit)) {
          out.push({ stockName: name, issue });
        }
      }
    };
    push(CURRENT_STOCK_NAMES);
    push(SPARE_STOCK_NAMES);
    return out;
  }, [stocks, viewport]);

  const [index, setIndex] = useState(0);
  const { setActiveIssue } = useActiveIssue();

  // Reset index if flat shrinks (e.g. switching to mobile trims to top-10).
  useEffect(() => {
    if (flat.length === 0) {
      if (index !== 0) setIndex(0);
      return;
    }
    if (index >= flat.length) setIndex(index % flat.length);
  }, [flat.length, index]);

  // Publish current issue while visible.
  useEffect(() => {
    if (!visible) return;
    if (flat.length === 0) {
      setActiveIssue(null);
      return;
    }
    setActiveIssue(flat[index % flat.length].issue);
  }, [visible, flat, index, setActiveIssue]);

  // Auto-advance while visible.
  useEffect(() => {
    if (!visible) return;
    if (flat.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % flat.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [visible, flat.length]);

  if (!visible) return null;

  if (flat.length === 0) {
    return (
      <div className={styles.bar}>
        <span className={styles.text}>
          <AnalyzingText />
        </span>
      </div>
    );
  }

  const { stockName, issue } = flat[index % flat.length];

  return (
    <div className={styles.bar}>
      <div key={index} className={styles.slide}>
        <span className={styles.text}>{stockName}</span>
        <span className={styles.boxSlot}>
          <ColorBox
            signal={issue.signal}
            intensity={issue.intensity}
            size={SIGNAL_BOX_SIZE}
          />
        </span>
        <ArticleLink url={issue.source?.url} className={styles.text}>
          &ldquo;{issue.text}&rdquo;
        </ArticleLink>
      </div>
    </div>
  );
}
