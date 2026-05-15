import type { Signal } from "@/types";
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
  title?: string; // hover tooltip text (HTML title attribute, replaced in Step 2)
}

export function ColorBox({ signal, size, rounded = false, intensity = "mid", title }: Props) {
  const className = `${styles.box} ${rounded ? styles.rounded : ""} ${styles[signal]} ${
    signal !== "empty" ? styles[intensity] : ""
  }`;
  const style: React.CSSProperties = { width: size, height: size };
  return <div className={className} style={style} title={title} />;
}
