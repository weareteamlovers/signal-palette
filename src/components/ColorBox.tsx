"use client";

import type { Intensity, Issue, Signal } from "@/types";
import { useActiveIssue } from "./ActiveIssueContext";
import styles from "./ColorBox.module.css";

interface Props {
  /** Required when not loading. */
  signal?: Signal | "empty";
  size: number;
  rounded?: boolean; // small grid boxes use 3px; comp boxes use 0
  intensity?: Intensity;
  title?: string; // hover tooltip text
  /** When provided, the box becomes the "active" stroke target whenever the
   *  central ticker is showing this exact issue object. */
  issue?: Issue;
  /** Render a shimmering placeholder while analysis is in flight. */
  loading?: boolean;
  /** Order this box appears within its grid when filling in (0-based). Used
   *  to stagger the fade-in by 50ms per box. */
  staggerIndex?: number;
}

export function ColorBox({
  signal,
  size,
  rounded = false,
  intensity = "mid",
  title,
  issue,
  loading = false,
  staggerIndex,
}: Props) {
  const { activeIssue } = useActiveIssue();
  const isActive = !!issue && activeIssue === issue;

  if (loading) {
    const className = [styles.box, rounded ? styles.rounded : "", styles.shimmer]
      .filter(Boolean)
      .join(" ");
    return <div className={className} style={{ width: size, height: size }} />;
  }

  const className = [
    styles.box,
    rounded ? styles.rounded : "",
    signal ? styles[signal] : "",
    signal && signal !== "empty" ? styles[intensity] : "",
    isActive ? styles.active : "",
    typeof staggerIndex === "number" ? styles.fadeIn : "",
  ]
    .filter(Boolean)
    .join(" ");

  const style: React.CSSProperties = { width: size, height: size };
  if (typeof staggerIndex === "number") {
    style.animationDelay = `${staggerIndex * 50}ms`;
  }

  return <div className={className} style={style} data-tooltip={title} />;
}
