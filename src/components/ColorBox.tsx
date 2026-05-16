"use client";

import type { Issue, Signal } from "@/types";
import { useActiveIssue } from "./ActiveIssueContext";
import styles from "./ColorBox.module.css";

interface Props {
  signal: Signal | "empty";
  size: number;
  rounded?: boolean; // small grid boxes use 3px; comp boxes use 0
  /**
   * For empty boxes, we render a dotted/translucent placeholder so the grid
   * shape is preserved. For filled boxes, we use the signal color.
   *
   * `intensity` lets us pick mid/mild/strong shade per signal in later steps.
   */
  intensity?: "strong" | "mid" | "mild";
  title?: string; // hover tooltip text
  /** When provided, the box becomes the "active" stroke target whenever the
   *  central ticker is showing this exact issue object. */
  issue?: Issue;
}

export function ColorBox({
  signal,
  size,
  rounded = false,
  intensity = "mid",
  title,
  issue,
}: Props) {
  const { activeIssue } = useActiveIssue();
  const isActive = !!issue && activeIssue === issue;

  const className = [
    styles.box,
    rounded ? styles.rounded : "",
    styles[signal],
    signal !== "empty" ? styles[intensity] : "",
    isActive ? styles.active : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      style={{ width: size, height: size }}
      data-tooltip={title}
    />
  );
}
